package digilib.meta;

import digilib.io.DocuDirectory;

/**
 * Minimal DirMeta implementation just holding a MetadataMap.
 * 
 * @author casties
 *
 */
public class SimpleDirMeta implements DirMeta {

    protected MetadataMap meta = null;

    public SimpleDirMeta() {
        super();
        meta = new MetadataMap();
    }

    public SimpleDirMeta(MetadataMap meta) {
        super();
        this.meta = meta;
    }

    @Override
    public void readMeta(DocuDirectory dir) {
        // no implementation here
    }

    @Override
    public void checkMeta(DocuDirectory dir) {
        // no implementation here
    }

    @Override
    public MetadataMap getDirMeta() {
        return this.meta;
    }

    @Override
    public void setDirMeta(MetadataMap dirMeta) {
        this.meta = dirMeta;
    }

}
