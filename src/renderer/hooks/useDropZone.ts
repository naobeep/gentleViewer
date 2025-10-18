// renderer/hooks/useDropZone.ts

interface DropZoneOptions {
  onDrop: (files: FileInfo[], targetId?: number) => void;
  onDragEnter?: () => void;
  onDragLeave?: () => void;
  accept?: string[];
}

export const useDropZone = (
  ref: RefObject<HTMLElement>,
  options: DropZoneOptions
) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [canDrop, setCanDrop] = useState(true);
  const dragCounterRef = useRef(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      dragCounterRef.current++;

      if (dragCounterRef.current === 1) {
        setIsDragOver(true);
        options.onDragEnter?.();

        // ドロップ可能かチェック
        const dragData = e.dataTransfer?.getData('application/json');
        if (dragData && options.accept) {
          const data = JSON.parse(dragData);
          const acceptable = options.accept.includes(data.type);
          setCanDrop(acceptable);
        }
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = canDrop ? 'copy' : 'none';
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      dragCounterRef.current--;

      if (dragCounterRef.current === 0) {
        setIsDragOver(false);
        setCanDrop(true);
        options.onDragLeave?.();
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      dragCounterRef.current = 0;
      setIsDragOver(false);
      setCanDrop(true);

      if (!canDrop) return;

      const dragData = e.dataTransfer?.getData('application/json');
      if (dragData) {
        const data = JSON.parse(dragData);
        options.onDrop(data.files, data.targetId);
      }
    };

    element.addEventListener('dragenter', handleDragEnter);
    element.addEventListener('dragover', handleDragOver);
    element.addEventListener('dragleave', handleDragLeave);
    element.addEventListener('drop', handleDrop);

    return () => {
      element.removeEventListener('dragenter', handleDragEnter);
      element.removeEventListener('dragover', handleDragOver);
      element.removeEventListener('dragleave', handleDragLeave);
      element.removeEventListener('drop', handleDrop);
    };
  }, [ref, options, canDrop]);

  return { isDragOver, canDrop };
};
