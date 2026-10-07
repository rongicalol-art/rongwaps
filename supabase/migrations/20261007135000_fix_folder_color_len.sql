-- Hotfix: user_folders.color holds serializeFolderColor() JSON (~150 chars),
-- so the 64-char bound from 20261007120000 rejected every new folder.
ALTER TABLE public.user_folders
    DROP CONSTRAINT IF EXISTS user_folders_text_len,
    ADD CONSTRAINT user_folders_text_len
        CHECK (char_length(name) <= 200 AND char_length(color) <= 512) NOT VALID;
