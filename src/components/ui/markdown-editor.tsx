'use client';

import React from 'react';
import SimpleMdeEditor from "react-simplemde-editor";
import "easymde/dist/easymde.min.css";

interface MarkdownEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ value, onChange, placeholder }) => {
    return (
        <SimpleMdeEditor
            value={value}
            onChange={onChange}
            options={{
                autofocus: true,
                spellChecker: false,
                toolbar: ["bold", "italic", "heading", "|", "quote", "unordered-list", "ordered-list", "|", "link", "image", "|", "preview", "guide"],
                placeholder,
            }}
        />
    );
};

export default MarkdownEditor;
