"use client";

import { CKEditor } from "@ckeditor/ckeditor5-react";
import {
  ClassicEditor,
  Essentials,
  Paragraph,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Link,
  List,
  Heading,
  BlockQuote,
  Table,
  TableToolbar,
  Image,
  ImageToolbar,
  ImageCaption,
  ImageStyle,
  ImageResize,
  AutoImage,
  MediaEmbed,
  Undo,
} from "ckeditor5";
import "ckeditor5/ckeditor5.css";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export default function CkEditorField({ value, onChange }: Props) {
  return (
    <div className="bg-white text-black rounded">
      <CKEditor
        editor={ClassicEditor}
        config={{
          licenseKey: "GPL",
          plugins: [
            Essentials,
            Paragraph,
            Bold,
            Italic,
            Underline,
            Strikethrough,
            Link,
            List,
            Heading,
            BlockQuote,
            Table,
            TableToolbar,
            Image,
            ImageToolbar,
            ImageCaption,
            ImageStyle,
            ImageResize,
            AutoImage,
            MediaEmbed,
            Undo,
          ],
          toolbar: [
            "undo",
            "redo",
            "|",
            "heading",
            "|",
            "bold",
            "italic",
            "underline",
            "strikethrough",
            "|",
            "link",
            "bulletedList",
            "numberedList",
            "blockQuote",
            "|",
            "insertTable",
            "mediaEmbed",
          ],
          table: {
            contentToolbar: ["tableColumn", "tableRow", "mergeTableCells"],
          },
          image: {
            toolbar: [
              "imageTextAlternative",
              "toggleImageCaption",
              "imageStyle:inline",
              "imageStyle:block",
              "imageStyle:side",
            ],
          },
        }}
        data={value || ""}
        onChange={(_, editor) => {
          onChange(editor.getData());
        }}
      />
    </div>
  );
}