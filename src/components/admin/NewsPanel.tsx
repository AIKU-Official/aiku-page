"use client";

import clsx from "clsx";
import { useRef, useState, useTransition, type FormEvent } from "react";

import { deleteNews, reorderNews, saveNews } from "@/actions/news";
import { Button } from "@/components/ui/Button";
import type { NewsItem } from "@/lib/types";

import { AdminItem, EmptyAdminText, ItemButton, ListHead } from "./AdminList";
import { AdminPanel } from "./AdminPanel";
import { SortableList } from "./SortableList";
import { fromResult, info, scrollToForm } from "./status";
import {
  AdminActions,
  adminFormClassName,
  FormGrid,
  StatusMessage,
  TextAreaField,
  TextField,
  type Status,
} from "./ui";

export function NewsPanel({ news }: { news: NewsItem[] }) {
  const [status, setStatus] = useState<Status>(null);
  const [editing, setEditing] = useState<NewsItem | null>(null);
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
    // Set outside the transition so it shows while the save is in flight.
    setStatus(info("저장 중입니다."));
    startTransition(async () => {
      const result = await saveNews({
        id: editing?.id,
        date: form.get("date"),
        title: form.get("title"),
        summary: form.get("summary"),
        linkUrl: form.get("linkUrl"),
        linkLabel: form.get("linkLabel"),
      });
      if (result.ok) resetForm();
      setStatus(fromResult(result));
    });
  };

  const edit = (item: NewsItem) => {
    setEditing(item);
    setFormKey((key) => key + 1);
    setStatus(info("수정할 소식을 불러왔습니다."));
    scrollToForm(formRef.current);
  };

  const remove = (item: NewsItem) => {
    if (!window.confirm("이 소식을 삭제할까요?")) return;
    startTransition(async () => {
      const result = await deleteNews(item.id);
      if (result.ok) resetForm();
      setStatus(fromResult(result));
    });
  };

  const reorder = async (ids: string[]) => {
    setStatus(info("소식 순서를 저장하는 중입니다."));
    setStatus(fromResult(await reorderNews(ids)));
  };

  return (
    <AdminPanel id="news-admin-title" eyebrow="News" title="소식 관리">
      <form
        key={`news-form-${formKey}`}
        ref={formRef}
        onSubmit={onSubmit}
        className={clsx(adminFormClassName, "scroll-mt-[calc(var(--header-height)+18px)]")}
      >
        <FormGrid>
          <TextField label="날짜" name="date" type="date" defaultValue={editing?.date ?? ""} />
          <TextField label="제목" name="title" required defaultValue={editing?.title} />
        </FormGrid>
        <TextAreaField label="요약" name="summary" rows={4} defaultValue={editing?.summary} />
        <FormGrid>
          <TextField
            label="링크 URL"
            name="linkUrl"
            placeholder="/projects 또는 https://..."
            defaultValue={editing?.linkUrl ?? ""}
          />
          <TextField
            label="링크 라벨"
            name="linkLabel"
            placeholder="보기"
            defaultValue={editing?.linkLabel}
          />
        </FormGrid>
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
            새 소식
          </Button>
        </AdminActions>
      </form>

      <ListHead
        title="등록된 소식 관리"
        description="홈 화면 News에 표시할 소식을 수정/삭제하거나, 카드를 드래그해 공개 순서를 조정합니다."
      />
      {news.length ? (
        <SortableList
          className="grid border-t border-soft-line"
          items={news}
          getId={(item) => item.id}
          onReorder={reorder}
          getLabel={(item) => item.title}
          renderItem={(item, index, handle) => (
            <AdminItem
              handle={handle}
              label={`${index + 1} · ${item.date || "날짜 없음"}`}
              title={item.title}
              details={[item.summary || "요약이 없습니다."]}
              actions={
                <>
                  <ItemButton onClick={() => edit(item)}>소식 수정</ItemButton>
                  <ItemButton danger disabled={pending} onClick={() => remove(item)}>
                    소식 삭제
                  </ItemButton>
                </>
              }
            />
          )}
        />
      ) : (
        <EmptyAdminText>
          등록된 소식이 없습니다. 홈 화면 News에 표시할 소식을 추가하세요.
        </EmptyAdminText>
      )}
    </AdminPanel>
  );
}
