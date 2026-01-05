import {
  render, screen, fireEvent, waitFor 
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  describe, expect, it, vi 
} from 'vitest';
import { FileUpload } from './FileUpload';

function createFile(name: string, content: string, type = 'application/json'): File {
  return new File([content], name, { type });
}

interface MockDataTransfer {
  files: File[];
  items: Array<{
    kind: string;
    type: string;
    getAsFile: () => File;
  }>;
  types: string[];
}

function createDataTransfer(files: File[]): MockDataTransfer {
  return {
    files,
    items: files.map((file) => ({
      kind: 'file',
      type: file.type,
      getAsFile: () => file,
    })),
    types: ['Files'],
  };
}

function getDropZone(): HTMLElement {
  const dropZone = screen
    .getByRole('button', { name: /select file/i })
    .closest('div[class*="border-"]');
  if (dropZone === null) {
    throw new Error('Drop zone not found');
  }
  if (!(dropZone instanceof HTMLElement)) {
    throw new Error('Drop zone is not an HTMLElement');
  }
  return dropZone;
}

type OnFileLoaded = (content: string, filename: string) => void;
type OnError = (error: string) => void;

describe('FileUpload', () => {
  it('renders upload area with instructions', () => {
    render(<FileUpload onFileLoaded={vi.fn<OnFileLoaded>()} onError={vi.fn<OnError>()} />);

    const dropText = screen.getByText(/drop your rivière graph here/i);
    expect(dropText).toBeInTheDocument();
    const browseText = screen.getByText(/click to browse/i);
    expect(browseText).toBeInTheDocument();
    const button = screen.getByRole('button', { name: /select file/i });
    expect(button).toBeInTheDocument();
  });

  it('shows drag-over state when file dragged over', () => {
    render(<FileUpload onFileLoaded={vi.fn<OnFileLoaded>()} onError={vi.fn<OnError>()} />);

    const dropZone = getDropZone();

    expect(dropZone.className).toContain('border-dashed');
    expect(dropZone.className).not.toContain('bg-[var(--primary)]/5');

    fireEvent.dragOver(dropZone);
    expect(dropZone.className).toContain('bg-[var(--primary)]/5');

    fireEvent.dragLeave(dropZone);
    expect(dropZone.className).not.toContain('bg-[var(--primary)]/5');
  });

  it('calls onFileLoaded with content when valid JSON dropped', async () => {
    const onFileLoaded = vi.fn<OnFileLoaded>();
    const onError = vi.fn<OnError>();
    const jsonContent = '{"version": "1.0"}';

    class MockFileReader {
      result: string | null = null;
      onload: ((event: { target: { result: string } }) => void) | null = null;
      onerror: (() => void) | null = null;
      readAsText(): void {
        this.result = jsonContent;
        this.onload?.({ target: { result: jsonContent } });
      }
    }
    vi.stubGlobal('FileReader', MockFileReader);

    render(<FileUpload onFileLoaded={onFileLoaded} onError={onError} />);

    const file = createFile('graph.json', jsonContent);
    const dropZone = getDropZone();

    fireEvent.drop(dropZone, { dataTransfer: createDataTransfer([file]) });

    await waitFor(() => {
      expect(onFileLoaded).toHaveBeenCalledWith(jsonContent, 'graph.json');
    });
    expect(onError).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('calls onError when non-JSON file dropped', () => {
    const onFileLoaded = vi.fn<OnFileLoaded>();
    const onError = vi.fn<OnError>();

    render(<FileUpload onFileLoaded={onFileLoaded} onError={onError} />);

    const file = createFile('data.txt', 'not json', 'text/plain');
    const dropZone = getDropZone();

    fireEvent.drop(dropZone, { dataTransfer: createDataTransfer([file]) });

    expect(onError).toHaveBeenCalledWith('Please upload a JSON file');
    expect(onFileLoaded).not.toHaveBeenCalled();
  });

  it('triggers file input when button clicked', async () => {
    const user = userEvent.setup();

    render(<FileUpload onFileLoaded={vi.fn<OnFileLoaded>()} onError={vi.fn<OnError>()} />);

    const fileInput = document.querySelector('input[type="file"]');
    if (!(fileInput instanceof HTMLInputElement)) {
      throw new Error('File input not found');
    }
    const clickSpy = vi.spyOn(fileInput, 'click');

    const button = screen.getByRole('button', { name: /select file/i });
    await user.click(button);

    expect(clickSpy).toHaveBeenCalled();
  });

  it('has accessible file input with label', () => {
    render(<FileUpload onFileLoaded={vi.fn<OnFileLoaded>()} onError={vi.fn<OnError>()} />);

    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toHaveAttribute('aria-label', 'Upload file');
  });

  it('button is keyboard accessible', async () => {
    const user = userEvent.setup();

    render(<FileUpload onFileLoaded={vi.fn<OnFileLoaded>()} onError={vi.fn<OnError>()} />);

    const button = screen.getByRole('button', { name: /select file/i });
    const fileInput = document.querySelector('input[type="file"]');
    if (!(fileInput instanceof HTMLInputElement)) {
      throw new Error('File input not found');
    }
    const clickSpy = vi.spyOn(fileInput, 'click');

    button.focus();
    expect(button).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(clickSpy).toHaveBeenCalled();
  });

  it('calls onError when FileReader fails', async () => {
    const onFileLoaded = vi.fn<OnFileLoaded>();
    const onError = vi.fn<OnError>();

    class MockFileReader {
      result: string | null = null;
      onload: ((event: { target: { result: string } }) => void) | null = null;
      onerror: (() => void) | null = null;
      readAsText(): void {
        this.onerror?.();
      }
    }
    vi.stubGlobal('FileReader', MockFileReader);

    render(<FileUpload onFileLoaded={onFileLoaded} onError={onError} />);

    const file = createFile('graph.json', '{}');
    const dropZone = getDropZone();

    fireEvent.drop(dropZone, { dataTransfer: createDataTransfer([file]) });

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith('Failed to read file');
    });
    expect(onFileLoaded).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('calls onError when FileReader returns non-string result', async () => {
    const onFileLoaded = vi.fn<OnFileLoaded>();
    const onError = vi.fn<OnError>();

    class MockFileReader {
      result: ArrayBuffer | null = null;
      onload: ((event: { target: { result: ArrayBuffer | null } }) => void) | null = null;
      onerror: (() => void) | null = null;
      readAsText(): void {
        const buffer = new ArrayBuffer(8);
        this.result = buffer;
        this.onload?.({ target: { result: buffer } });
      }
    }
    vi.stubGlobal('FileReader', MockFileReader);

    render(<FileUpload onFileLoaded={onFileLoaded} onError={onError} />);

    const file = createFile('graph.json', '{}');
    const dropZone = getDropZone();

    fireEvent.drop(dropZone, { dataTransfer: createDataTransfer([file]) });

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith('Failed to read file content');
    });
    expect(onFileLoaded).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});
