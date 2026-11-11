"use client";

import clsx from "clsx";
import { useRef, useState, useTransition, type FormEvent } from "react";

import {
  addGeneration,
  deleteGeneration,
  deleteMember,
  reorderGenerations,
  reorderMembers,
  saveMember,
} from "@/actions/members";
import { Button } from "@/components/ui/Button";
import { MEMBER_GRADE_LABELS, MEMBER_GRADES, type Generation, type Member } from "@/lib/types";

import { AdminItem, EmptyAdminText, ItemButton, ItemText, ListHead } from "./AdminList";
import { AdminPanel } from "./AdminPanel";
import { SortableList } from "./SortableList";
import { failure, fromResult, info, scrollToForm } from "./status";
import {
  AdminActions,
  adminFormClassName,
  FormGrid,
  Checkbox,
  SelectField,
  StatusMessage,
  TextField,
  type Status,
} from "./ui";

export function MembersPanel({ generations }: { generations: Generation[] }) {
  const [generationStatus, setGenerationStatus] = useState<Status>(null);
  const [memberStatus, setMemberStatus] = useState<Status>(null);
  const [generationFormKey, setGenerationFormKey] = useState(0);
  const [editing, setEditing] = useState<Member | null>(null);
  const [memberFormKey, setMemberFormKey] = useState(0);
  const [pending, startTransition] = useTransition();
  const memberFormRef = useRef<HTMLFormElement>(null);

  const resetMemberForm = () => {
    setEditing(null);
    setMemberFormKey((key) => key + 1);
  };

  const onAddGeneration = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = new FormData(event.currentTarget).get("generation");
    setGenerationStatus(info("기수를 추가하는 중입니다."));
    startTransition(async () => {
      const result = await addGeneration(name);
      if (result.ok) setGenerationFormKey((key) => key + 1);
      setGenerationStatus(fromResult(result));
    });
  };

  const removeGeneration = (generation: Generation) => {
    if (!window.confirm(`${generation.name} 기수를 삭제할까요? 멤버가 없는 기수만 삭제됩니다.`)) {
      return;
    }
    startTransition(async () => {
      setGenerationStatus(fromResult(await deleteGeneration(generation.id)));
    });
  };

  const onSaveMember = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!generations.length) {
      setMemberStatus(failure("멤버를 저장하려면 기수를 먼저 추가하세요."));
      return;
    }

    const form = new FormData(event.currentTarget);

    setMemberStatus(info("저장 중입니다."));
    startTransition(async () => {
      const result = await saveMember({
        id: editing?.id ?? crypto.randomUUID(),
        isNew: !editing,
        generationId: form.get("generationId") ?? "",
        name: form.get("name"),
        department: form.get("department"),
        grade: form.get("grade"),
        gradePinned: form.get("gradePinned") === "on",
        position: form.get("position"),
      });
      if (result.ok) resetMemberForm();
      setMemberStatus(fromResult(result));
    });
  };

  const editMember = (member: Member) => {
    setEditing(member);
    setMemberFormKey((key) => key + 1);
    setMemberStatus(info("수정할 멤버 프로필을 불러왔습니다."));
    scrollToForm(memberFormRef.current);
  };

  const removeMember = (member: Member) => {
    if (
      !window.confirm("이 멤버 프로필을 삭제할까요? 멤버가 올린 프로필 사진도 함께 삭제됩니다.")
    ) {
      return;
    }
    startTransition(async () => {
      const result = await deleteMember(member.id);
      if (result.ok) resetMemberForm();
      setMemberStatus(fromResult(result));
    });
  };

  return (
    <AdminPanel id="alumni-admin-title" eyebrow="Members" title="멤버 관리">
      <form
        key={`generation-form-${generationFormKey}`}
        onSubmit={onAddGeneration}
        className={clsx(
          adminFormClassName,
          "grid-cols-[minmax(0,1fr)_auto] items-end max-lg:grid-cols-1",
        )}
      >
        <TextField label="새 기수" name="generation" placeholder="예: 0기, 1기" required />
        <AdminActions>
          <Button type="submit" variant="dark" disabled={pending}>
            기수 추가
          </Button>
        </AdminActions>
        <StatusMessage status={generationStatus} className="col-span-full" />
      </form>

      <form
        key={`member-form-${memberFormKey}`}
        ref={memberFormRef}
        onSubmit={onSaveMember}
        className={clsx(adminFormClassName, "scroll-mt-[calc(var(--header-height)+18px)]")}
      >
        <FormGrid>
          <SelectField
            label="기수"
            name="generationId"
            required
            disabled={!generations.length}
            defaultValue={editing?.generationId ?? generations[0]?.id ?? ""}
          >
            {generations.length ? (
              generations.map((generation) => (
                <option key={generation.id} value={generation.id}>
                  {generation.name}
                </option>
              ))
            ) : (
              <option value="">기수를 먼저 추가하세요</option>
            )}
          </SelectField>
          <TextField label="멤버 이름" name="name" required defaultValue={editing?.name} />
        </FormGrid>
        <FormGrid>
          <SelectField label="등급" name="grade" required defaultValue={editing?.grade ?? "junior"}>
            {MEMBER_GRADES.map((grade) => (
              <option key={grade} value={grade}>
                {MEMBER_GRADE_LABELS[grade]}
              </option>
            ))}
          </SelectField>
          <TextField
            label="학과"
            name="department"
            placeholder="예: 컴퓨터학과"
            defaultValue={editing?.department}
          />
        </FormGrid>
        <label className="flex items-start gap-2.5 text-small text-body">
          <Checkbox name="gradePinned" defaultChecked={editing?.gradePinned} className="mt-0.5" />
          <span>
            등급 고정 (특이사항)
            <span className="block text-muted">
              최신 기수보다 두 기수 이상 앞선 멤버는 저장할 때 자동으로 OB가 됩니다. 예외로 위에서
              고른 등급을 유지하려면 체크하세요.
            </span>
          </span>
        </label>
        <TextField
          label="직책"
          name="position"
          placeholder="예: 8기 회장 (여러 개는 쉼표로 구분, 없으면 비워두세요)"
          defaultValue={editing?.position}
        />
        <StatusMessage status={memberStatus} />
        <AdminActions>
          <Button type="submit" variant="dark" disabled={pending}>
            저장
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              resetMemberForm();
              setMemberStatus(null);
            }}
          >
            새 멤버
          </Button>
        </AdminActions>
      </form>

      <ListHead
        title="등록된 멤버 관리"
        description="활동 중인 학회원과 AIKU를 거쳐간 멤버를 기수별로 수정/삭제하거나, 같은 기수 안에서 카드를 드래그해 공개 순서를 조정합니다."
      />
      {generations.length ? (
        <SortableList
          className="grid border-t border-soft-line [&>div:last-child>section]:border-b-0"
          dragBy="handle"
          items={generations}
          getId={(generation) => generation.id}
          getLabel={(generation) => generation.name}
          onReorder={async (ids) => {
            setGenerationStatus(info("기수 순서를 저장하는 중입니다."));
            setGenerationStatus(fromResult(await reorderGenerations(ids)));
          }}
          renderItem={(generation, _index, handle) => (
            <section className="grid gap-2 border-b border-soft-line pt-[18px] pb-2">
              <div className="flex items-center justify-between gap-3 max-lg:flex-wrap">
                <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
                  {handle}
                  <div>
                    <h3>{generation.name}</h3>
                    <p className="text-small text-muted">멤버 {generation.members.length}명</p>
                  </div>
                </div>
                <ItemButton
                  danger
                  disabled={generation.members.length > 0 || pending}
                  title={
                    generation.members.length > 0
                      ? "멤버가 있는 기수는 삭제할 수 없습니다."
                      : undefined
                  }
                  onClick={() => removeGeneration(generation)}
                >
                  기수 삭제
                </ItemButton>
              </div>
              {generation.members.length ? (
                <SortableList
                  className="grid"
                  items={generation.members}
                  getId={(member) => member.id}
                  getLabel={(member) => member.name}
                  onReorder={async (ids) => {
                    setMemberStatus(info("멤버 순서를 저장하는 중입니다."));
                    setMemberStatus(
                      fromResult(await reorderMembers({ generationId: generation.id, ids })),
                    );
                  }}
                  renderItem={(member, index, memberHandle) => (
                    <AdminItem
                      handle={memberHandle}
                      label={index + 1}
                      title={member.name}
                      body={<MemberSummary member={member} index={index} />}
                      actions={
                        <>
                          <ItemButton onClick={() => editMember(member)}>멤버 수정</ItemButton>
                          <ItemButton
                            danger
                            disabled={pending}
                            onClick={() => removeMember(member)}
                          >
                            멤버 삭제
                          </ItemButton>
                        </>
                      }
                    />
                  )}
                />
              ) : (
                <EmptyAdminText>아직 이 기수에 추가된 멤버가 없습니다.</EmptyAdminText>
              )}
            </section>
          )}
        />
      ) : (
        <EmptyAdminText>
          등록된 기수가 없습니다. 멤버를 추가하려면 기수를 먼저 추가하세요.
        </EmptyAdminText>
      )}
    </AdminPanel>
  );
}

function MemberSummary({ member, index }: { member: Member; index: number }) {
  return (
    <ItemText
      label={index + 1}
      title={member.name}
      details={[
        [MEMBER_GRADE_LABELS[member.grade], member.department, member.position]
          .filter(Boolean)
          .join(" · "),
      ]}
    />
  );
}
