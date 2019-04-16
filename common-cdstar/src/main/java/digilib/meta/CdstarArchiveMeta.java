/**
 * 
 */
package digilib.meta;

import digilib.io.DocuDirectory;

/**
 * @author casties
 *
 */
public class CdstarArchiveMeta implements DirMeta {

    private MetadataMap meta = null;

    /**
     * 
     */
    public CdstarArchiveMeta(MetadataMap dirMeta) {
        this.meta = dirMeta;
    }

    @Override
    public void readMeta(DocuDirectory dir) {
        // should be read by CdstarArchiveDocuDirectory
    }

    @Override
    public void checkMeta(DocuDirectory dir) {
        // should be read by CdstarArchiveDocuDirectory
    }

    @Override
    public MetadataMap getDirMeta() {
        return meta;
    }

    @Override
    public void setDirMeta(MetadataMap dirMeta) {
        this.meta = dirMeta;
    }

}
