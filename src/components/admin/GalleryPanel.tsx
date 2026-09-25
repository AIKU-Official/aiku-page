"use client";

import clsx from "clsx";
import { useRef, useState, useTransition, type FormEvent } from "react";

import { deleteGalleryItem, reorderGallery, saveGalleryItem } from "@/actions/gallery";
import { Button } from "@/components/ui/Button";
import { displayFileName } from "@/lib/admin/files";
import { cleanUpUploads, pickedFiles, uploadFiles } from "@/lib/admin/upload";
import type { GalleryItem } from "@/lib/types";

import { AdminItem, EmptyAdminText, ItemButton, ListHead } from "./AdminList";
import { AdminPanel } from "./AdminPanel";
import { SortableList } from "./SortableList";
import { fromError, fromResult, info, scrollToForm } from "./status";
import {
  AdminActions,
  adminFormClassName,
  FileNote,
  FormGrid,
  StatusMessage,
  TextAreaField,
  TextField,
  type Status,
} from "./ui";

export function GalleryPanel({ items }: { items: GalleryItem[] }) {
  const [status, setStatus] = useState<Status>(null);
  const [editing, setEditing] = useState<GalleryItem | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const resetForm = () => {
    setEditing(null);
    setFormKey((key) => key + 1);
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const id = editing?.id ?? crypto.randomUUID();
    const image = pickedFiles(form, "image")[0];

    setStatus(info("저장 중입니다."));
    startTransition(async () => {
      let uploaded: string[];
      try {
        uploaded = await uploadFiles(
          "gallery",
          id,
          image ? [{ file: image, kind: "image" }] : [],
          (done, total) => setStatus(info(`파일을 업로드하는 중입니다. (${done}/${total})`)),
        );
      } catch (error) {
        setStatus(fromError(error));
        return;
      }

      const result = await saveGalleryItem({
        id,
        isNew: !editing,
        category: form.get("category"),
        title: form.get("title"),
        description: form.get("description"),
        image: uploaded[0] ?? null,
      });
      if (!result.ok) {
        await cleanUpUploads("gallery", id, uploaded);
      } else {
        resetForm();
      }
      setStatus(fromResult(result));
    });
  };

  const edit = (item: GalleryItem) => {
    setEditing(item);
    setFormKey((key) => key + 1);
    setStatus(info("수정할 갤러리 항목을 불러왔습니다."));
    scrollToForm(formRef.current);
  };

  const remove = (item: GalleryItem) => {
    if (
      !window.confirm(
        "이 갤러리 항목을 삭제할까요? 관리자에서 새로 업로드한 이미지 파일도 함께 삭제됩니다.",
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await deleteGalleryItem(item.id);
      if (result.ok) resetForm();
      setStatus(fromResult(result));
    });
  };

  return (
    <AdminPanel id="gallery-admin-title" eyebrow="Gallery" title="갤러리 업로드">
      <form
        key={`gallery-form-${formKey}`}
        ref={formRef}
        onSubmit={onSubmit}
        className={clsx(adminFormClassName, "scroll-mt-[calc(var(--header-height)+18px)]")}
      >
        <FormGrid>
          <TextField
            label="분류"
            name="category"
            placeholder="Conference, Networking, Project"
            defaultValue={editing?.category}
          />
          <TextField label="제목" name="title" required defaultValue={editing?.title} />
        </FormGrid>
        <TextAreaField
          label="설명"
          name="description"
          rows={4}
          defaultValue={editing?.description}
        />
        <TextField label="이미지" name="image" type="file" accept="image/*" />
        {editing?.imagePath ? (
          <FileNote>
            현재 이미지: {displayFileName(editing.imagePath)} (새 이미지를 선택하면 교체합니다.)
          </FileNote>
        ) : null}
        <StatusMessage status={status} />
        <AdminActions>
          <Button type="submit" variant="dark" disabled={pending}>
            저장
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              resetForm();
              setStatus(null);
            }}
          >
            새 갤러리
          </Button>
        </AdminActions>
      </form>

      <ListHead
        title="등록된 갤러리 관리"
        description="갤러리 항목을 수정/삭제하거나, 카드를 드래그해 공개 순서를 조정합니다."
      />
      {items.length ? (
        <SortableList
          className="grid border-t border-soft-line"
          items={items}
          getId={(item) => item.id}
          onReorder={async (ids) => {
            setStatus(info("갤러리 순서를 저장하는 중입니다."));
            setStatus(fromResult(await reorderGallery(ids)));
          }}
          getLabel={(item) => item.title}
          renderItem={(item, index, handle) => (
            <AdminItem
              handle={handle}
              label={`${index + 1} · ${item.category || "AIKU"}`}
              title={item.title}
              details={[item.description || "설명이 없습니다."]}
              actions={
                <>
                  <ItemButton onClick={() => edit(item)}>갤러리 수정</ItemButton>
                  <ItemButton danger disabled={pending} onClick={() => remove(item)}>
                    갤러리 삭제
                  </ItemButton>
                </>
              }
            />
          )}
        />
      ) : (
        <EmptyAdminText>
          아직 관리자에서 등록한 갤러리 항목이 없습니다. 이 목록에 나타나는 갤러리는 여기서
          수정/삭제할 수 있습니다.
        </EmptyAdminText>
      )}
    </AdminPanel>
  );
}
