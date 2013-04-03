/**
 * 
 */
package digilib.meta;

import digilib.io.DocuDirectory;

/**
 * @author casties
 *
 */
public interface DirMeta {

    /**
     * read and store metadata for this directory.
     * @param dir
     */
    public void readMeta(DocuDirectory dir);

    /**
     * check and process metadata for this directory.
     * 
     * @param docuDirectory
     */
    public void checkMeta(DocuDirectory dir);

    /**
     * returns metadata for this directory
     * 
     * @return
     */
    public MetadataMap getDirMeta();

    /**
     * sets the metadata for this directory.
     * 
     * @param dirMeta
     */
    public void setDirMeta(MetadataMap dirMeta);

}
