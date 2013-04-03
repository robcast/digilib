/**
 * 
 */
package digilib.meta;

import digilib.io.DocuDirent;

/**
 * @author casties
 *
 */
public interface FileMeta {

    /**
     * returns a MetadataMap with metadata for this File.
     * 
     * @param file
     * @return
     */
    void readMeta(DocuDirent dirent);

    MetadataMap getFileMeta();

    void setFileMeta(MetadataMap fileMeta);

    boolean isChecked();

    void checkMeta(DocuDirent dirent);
}
