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
     * read and store metadata for this file.
     * 
     * @param dirent
     */
    public void readMeta(DocuDirent file);

    /**
     * check and process metadata for this file.
     * 
     * @param dirent
     */
    public void checkMeta(DocuDirent file);

    /**
     * returns a MetadataMap with metadata for this File.
     * 
     * @param file
     * @return
     */
    public MetadataMap getFileMeta();

    /**
     * set metadata for this file.
     * @param fileMeta
     */
    public void setFileMeta(MetadataMap fileMeta);

}
