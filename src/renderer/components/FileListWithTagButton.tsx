import React, { useState } from 'react';
import TagEditorDialog from './TagEditorDialog';

export default function FileListWithTagButton({ selectedFiles }: { selectedFiles: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(true)} disabled={!selectedFiles || selectedFiles.length === 0}>
        タグ編集
      </button>
      <TagEditorDialog open={open} onClose={() => setOpen(false)} filePaths={selectedFiles} />
    </div>
  );
}
