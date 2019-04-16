/**
 * 
 */
package digilib.meta;

import digilib.io.DocuDirent;

/**
 * @author casties
 *
 */
public class CdstarFileMeta implements FileMeta {

    private MetadataMap meta = null;


    /**
     * 
     */
    public CdstarFileMeta(MetadataMap fileMeta) {
        this.meta = fileMeta;
    }

    @Override
    public void readMeta(DocuDirent file) {
        // should be read by CdstarArchiveDocuDirectory
    }

    @Override
    public void checkMeta(DocuDirent file) {
        // should be read by CdstarArchiveDocuDirectory
    }

    @Override
    public MetadataMap getFileMeta() {
        return meta;
    }

    @Override
    public void setFileMeta(MetadataMap fileMeta) {
        this.meta = fileMeta;
    }

}
