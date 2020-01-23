package digilib.meta;

import digilib.io.DocuDirent;

/**
 * Minimal FileMeta class just holding a MetadataMap.
 * 
 * @author casties
 *
 */
public class SimpleFileMeta implements FileMeta {

    protected MetadataMap meta = null;

    public SimpleFileMeta() {
        super();
        this.meta = new MetadataMap();
    }

    /**
     * Creates FileMeta with the given MetadataMap.
     */
    public SimpleFileMeta(MetadataMap meta) {
        super();
        this.meta = meta;
    }

    @Override
    public void readMeta(DocuDirent file) {
        // no implementation here
    }

    @Override
    public void checkMeta(DocuDirent file) {
      // no implementation here
    }

    @Override
    public MetadataMap getFileMeta() {
        return meta;
    }

    @Override
    public void setFileMeta(MetadataMap fileMeta) {
        meta = fileMeta;
    }

}
