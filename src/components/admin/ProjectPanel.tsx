"use client";

import clsx from "clsx";
import { useEffect, useRef, useState, useTransition, type FormEvent, type RefObject } from "react";

import { deleteProject, reorderProjects, saveProject } from "@/actions/projects";
import { addSeason, deleteSeason, reorderSeasons } from "@/actions/seasons";
import { Button } from "@/components/ui/Button";
import { displayFileName } from "@/lib/admin/files";
import { cleanUpUploads, pickedFiles, uploadFiles, type PendingFile } from "@/lib/admin/upload";
import { storagePublicUrl } from "@/lib/storage/public-url";
import type { Project, Season } from "@/lib/types";

import { AdminItem, EmptyAdminText, ItemButton, ItemGroupHead, ListHead } from "./AdminList";
import { AdminPanel } from "./AdminPanel";
import { SortableList } from "./SortableList";
import { failure, fromError, fromResult, info, scrollToForm } from "./status";
import {
  AdminActions,
  adminFormClassName,
  FileNote,
  FormGrid,
  SelectField,
  StatusMessage,
  TextAreaField,
  TextField,
  type Status,
} from "./ui";

const LAST_SEASON_KEY = "aiku:last-project-season";

const readLastSeason = () => {
  try {
    return window.localStorage.getItem(LAST_SEASON_KEY);
  } catch {
    return null;
  }
};

const rememberSeason = (seasonId: string) => {
  try {
    window.localStorage.setItem(LAST_SEASON_KEY, seasonId);
  } catch {
    // Only a convenience; saving must not depend on storage.
  }
};

export function ProjectPanel({ seasons, projects }: { seasons: Season[]; projects: Project[] }) {
  const [status, setStatus] = useState<Status>(null);
  const [editing, setEditing] = useState<Project | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const resetForm = () => {
    setEditing(null);
    setFormKey((key) => key + 1);
  };

  const edit = (project: Project) => {
    setEditing(project);
    setFormKey((key) => key + 1);
    setStatus(info("수정할 프로젝트를 불러왔습니다."));
    scrollToForm(formRef.current);
  };

  const remove = (project: Project) => {
    if (
      !window.confirm("이 프로젝트를 삭제할까요? 관리자에서 새로 업로드한 파일도 함께 삭제됩니다.")
    ) {
      return;
    }
    startTransition(async () => {
      const result = await deleteProject(project.id);
      if (result.ok) resetForm();
      setStatus(fromResult(result));
    });
  };

  const groups = seasons
    .map((season) => ({
      season,
      projects: projects.filter((project) => project.seasonId === season.id),
    }))
    .filter((group) => group.projects.length);

  return (
    <AdminPanel id="project-admin-title" eyebrow="Projects" title="프로젝트 관리">
      <SeasonManager seasons={seasons} projects={projects} />

      <ProjectForm
        key={`project-form-${formKey}`}
        formRef={formRef}
        project={editing}
        seasons={seasons}
        status={status}
        setStatus={setStatus}
        onSaved={(message) => {
          resetForm();
          setStatus({ tone: "success", message });
        }}
        onReset={() => {
          resetForm();
          setStatus(null);
        }}
      />

      <ListHead
        title="등록된 프로젝트 관리"
        description="프로젝트를 수정/삭제하거나, 같은 시즌 안에서 프로젝트 카드를 드래그해 공개 순서를 조정합니다."
      />
      {groups.length ? (
        <div className="grid border-t border-soft-line">
          {groups.map(({ season, projects: seasonProjects }) => (
            <section
              key={season.id}
              className="grid gap-2 border-b border-soft-line pt-[18px] pb-2 last:border-b-0"
            >
              <ItemGroupHead title={season.name} count={`프로젝트 ${seasonProjects.length}개`} />
              <SortableList
                className="grid"
                items={seasonProjects}
                getId={(project) => project.id}
                onReorder={async (ids) => {
                  setStatus(info("프로젝트 순서를 저장하는 중입니다."));
                  setStatus(fromResult(await reorderProjects({ seasonId: season.id, ids })));
                }}
                getLabel={(project) => project.title}
                renderItem={(project, index, handle) => (
                  <AdminItem
                    handle={handle}
                    label={index + 1}
                    title={project.title}
                    details={[project.summary || "관련 분야 태그가 없습니다."]}
                    actions={
                      <>
                        <ItemButton onClick={() => edit(project)}>프로젝트 수정</ItemButton>
                        <ItemButton danger disabled={pending} onClick={() => remove(project)}>
                          프로젝트 삭제
                        </ItemButton>
                      </>
                    }
                  />
                )}
              />
            </section>
          ))}
        </div>
      ) : (
        <EmptyAdminText>
          아직 관리자에서 등록한 프로젝트가 없습니다. 이 목록에 나타나는 프로젝트는 여기서
          수정/삭제할 수 있습니다.
        </EmptyAdminText>
      )}
    </AdminPanel>
  );
}

function SeasonManager({ seasons, projects }: { seasons: Season[]; projects: Project[] }) {
  const [status, setStatus] = useState<Status>(null);
  const [formKey, setFormKey] = useState(0);
  const [pending, startTransition] = useTransition();

  const countOf = (season: Season) =>
    projects.filter((project) => project.seasonId === season.id).length;

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = new FormData(event.currentTarget).get("season");
    setStatus(info("시즌을 추가하는 중입니다."));
    startTransition(async () => {
      const result = await addSeason(name);
      if (result.ok) setFormKey((key) => key + 1);
      setStatus(fromResult(result));
    });
  };

  const remove = (season: Season) => {
    if (!window.confirm(`${season.name} 시즌을 삭제할까요? 프로젝트가 없는 시즌만 삭제됩니다.`)) {
      return;
    }
    startTransition(async () => {
      setStatus(fromResult(await deleteSeason(season.id)));
    });
  };

  return (
    <div className="grid gap-4 border-b border-soft-line pb-7">
      <ListHead
        flush
        title="시즌 추가 및 순서 관리"
        description="프로젝트가 공개될 분기를 추가하고, 시즌 카드를 드래그해서 공개 페이지의 순서를 조정합니다."
      />
      <form
        key={`season-form-${formKey}`}
        onSubmit={onSubmit}
        className={clsx(
          adminFormClassName,
          "grid-cols-[minmax(0,1fr)_auto] items-end max-lg:grid-cols-1",
        )}
      >
        <TextField label="새 시즌" name="season" placeholder="예: 26-summer" required />
        <AdminActions>
          <Button type="submit" variant="dark" disabled={pending}>
            시즌 추가
          </Button>
        </AdminActions>
        <StatusMessage status={status} className="col-span-full" />
      </form>
      {seasons.length ? (
        <SortableList
          className="grid"
          items={seasons}
          getId={(season) => season.id}
          onReorder={async (ids) => {
            setStatus(info("시즌 순서를 저장하는 중입니다."));
            setStatus(fromResult(await reorderSeasons(ids)));
          }}
          getLabel={(season) => season.name}
          renderItem={(season, index, handle) => {
            const count = countOf(season);
            return (
              <AdminItem
                compact
                handle={handle}
                label={index + 1}
                title={season.name}
                details={[`프로젝트 ${count}개`]}
                actions={
                  <ItemButton
                    danger
                    disabled={count > 0 || pending}
                    title={count > 0 ? "프로젝트가 있는 시즌은 삭제할 수 없습니다." : undefined}
                    onClick={() => remove(season)}
                  >
                    시즌 삭제
                  </ItemButton>
                }
              />
            );
          }}
        />
      ) : (
        <EmptyAdminText>
          등록된 시즌이 없습니다. 프로젝트를 올리려면 시즌을 먼저 추가하세요.
        </EmptyAdminText>
      )}
    </div>
  );
}

type ProjectFormProps = {
  formRef: RefObject<HTMLFormElement | null>;
  project: Project | null;
  seasons: Season[];
  status: Status;
  setStatus: (status: Status) => void;
  onSaved: (message: string) => void;
  onReset: () => void;
};

function ProjectForm({
  formRef,
  project,
  seasons,
  status,
  setStatus,
  onSaved,
  onReset,
}: ProjectFormProps) {
  const [pending, startTransition] = useTransition();
  const [removePresentation, setRemovePresentation] = useState(false);
  const [removedImages, setRemovedImages] = useState<string[]>([]);
  const seasonRef = useRef<HTMLSelectElement>(null);
  const preselected = useRef(false);

  // Preselect the season used last time, like the legacy admin did.
  useEffect(() => {
    if (preselected.current || project || !seasonRef.current) return;
    preselected.current = true;
    const last = readLastSeason();
    if (last && seasons.some((season) => season.id === last)) {
      seasonRef.current.value = last;
    }
  }, [project, seasons]);

  const toggleImage = (path: string) =>
    setRemovedImages((current) =>
      current.includes(path) ? current.filter((item) => item !== path) : [...current, path],
    );

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!seasons.length) {
      setStatus(failure("프로젝트를 저장하려면 시즌을 먼저 추가하세요."));
      return;
    }

    const form = new FormData(event.currentTarget);
    const id = project?.id ?? crypto.randomUUID();
    const seasonId = String(form.get("seasonId") ?? "");
    const presentation = pickedFiles(form, "presentation")[0];
    const files: PendingFile[] = [
      ...(presentation ? [{ file: presentation, kind: "presentation" as const }] : []),
      ...pickedFiles(form, "images").map((file) => ({ file, kind: "image" as const })),
    ];

    setStatus(info("저장 중입니다."));
    startTransition(async () => {
      let uploaded: string[];
      try {
        uploaded = await uploadFiles("projects", id, files, (done, total) =>
          setStatus(info(`파일을 업로드하는 중입니다. (${done}/${total})`)),
        );
      } catch (error) {
        setStatus(fromError(error));
        return;
      }

      const result = await saveProject({
        id,
        isNew: !project,
        seasonId,
        title: form.get("title"),
        summary: form.get("summary"),
        githubUrl: form.get("githubUrl"),
        markdown: form.get("markdown"),
        presentation: presentation ? { path: uploaded[0], name: presentation.name } : null,
        removePresentation,
        addImages: presentation ? uploaded.slice(1) : uploaded,
        removeImages: removedImages,
      });

      if (!result.ok) {
        await cleanUpUploads("projects", id, uploaded);
        setStatus(fromResult(result));
        return;
      }
      rememberSeason(seasonId);
      onSaved(result.message);
    });
  };

  const hasFiles = project && (project.presentationPath || project.imagePaths.length > 0);

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className={clsx(adminFormClassName, "scroll-mt-[calc(var(--header-height)+18px)]")}
    >
      <FormGrid>
        <SelectField
          ref={seasonRef}
          label="시즌"
          name="seasonId"
          required
          disabled={!seasons.length}
          defaultValue={project?.seasonId ?? seasons[0]?.id ?? ""}
        >
          {seasons.length ? (
            seasons.map((season) => (
              <option key={season.id} value={season.id}>
                {season.name}
              </option>
            ))
          ) : (
            <option value="">시즌을 먼저 추가하세요</option>
          )}
        </SelectField>
        <TextField label="프로젝트명" name="title" required defaultValue={project?.title} />
      </FormGrid>
      <TextField
        label="관련 분야 태그"
        name="summary"
        placeholder="#NLP #RL #LLM"
        defaultValue={project?.summary}
      />
      <TextField
        label="GitHub 링크"
        name="githubUrl"
        type="url"
        placeholder="https://github.com/AIKU-Official/..."
        defaultValue={project?.githubUrl ?? ""}
      />
      <TextAreaField
        label="프로젝트 설명"
        name="markdown"
        rows={16}
        placeholder="노션에서 복사한 마크다운 설명을 붙여넣으세요."
        defaultValue={project?.markdown}
      />
      <FormGrid>
        <TextField
          label="발표자료 PPT/PDF"
          name="presentation"
          type="file"
          accept=".ppt,.pptx,.pdf"
        />
        <TextField label="프로젝트 이미지" name="images" type="file" accept="image/*" multiple />
      </FormGrid>

      {hasFiles ? (
        <FileNote>
          <div className="grid gap-2">
            {project.presentationPath ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className={clsx("wrap-anywhere", removePresentation && "line-through")}>
                  현재 발표자료:{" "}
                  {project.presentationName ?? displayFileName(project.presentationPath)}
                </span>
                <ItemButton
                  danger={!removePresentation}
                  onClick={() => setRemovePresentation((v) => !v)}
                >
                  {removePresentation ? "삭제 취소" : "발표자료 삭제"}
                </ItemButton>
              </div>
            ) : null}
            {project.imagePaths.length ? (
              <div className="grid gap-2">
                <p>
                  현재 이미지 {project.imagePaths.length}개가 연결되어 있습니다. 새로 올린 이미지는
                  뒤에 추가됩니다.
                </p>
                <ul className="grid gap-1.5">
                  {project.imagePaths.map((path) => {
                    const removed = removedImages.includes(path);
                    return (
                      <li key={path} className="flex flex-wrap items-center gap-2">
                        <a
                          href={storagePublicUrl(path)}
                          target="_blank"
                          rel="noreferrer"
                          className={clsx("wrap-anywhere underline", removed && "line-through")}
                        >
                          {displayFileName(path)}
                        </a>
                        <ItemButton danger={!removed} onClick={() => toggleImage(path)}>
                          {removed ? "삭제 취소" : "이미지 삭제"}
                        </ItemButton>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
            <p>
              파일을 새로 선택하면 현재 발표자료를 교체합니다. 변경 사항은 저장할 때 반영됩니다.
            </p>
          </div>
        </FileNote>
      ) : null}

      <StatusMessage status={status} />
      <AdminActions>
        <Button type="submit" variant="dark" disabled={pending}>
          저장
        </Button>
        <Button variant="secondary" onClick={onReset}>
          새 프로젝트
        </Button>
      </AdminActions>
    </form>
  );
}
