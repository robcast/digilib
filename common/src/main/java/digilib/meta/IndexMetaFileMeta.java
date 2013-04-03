/**
 * 
 */
package digilib.meta;

import java.io.File;
import java.util.Map;

import org.apache.log4j.Logger;

import digilib.io.DocuDirectory;
import digilib.io.DocuDirent;

/**
 * @author casties
 * 
 */
public class IndexMetaFileMeta implements FileMeta {
    /** Log4J logger */
    protected static Logger logger = Logger.getLogger(IndexMetaFileMeta.class);

    protected MetadataMap fileMeta;

    /** state of metadata is valid */
    private boolean metaChecked = false;

    /*
     * (non-Javadoc)
     * 
     * @see digilib.meta.DocuMeta#readMeta(digilib.io.DocuDirent)
     */
    @Override
    public void readMeta(DocuDirent dirent) {
        // read file metadata
        File f = dirent.getFile();
        if (fileMeta != null || f == null) {
            // meta exists or file doesn't
            return;
        }
        String fn = f.getAbsolutePath();
        File mf = new File(fn + ".meta");
        if (mf.canRead()) {
            IndexMetaAuthLoader ml = new IndexMetaAuthLoader();
            try {
                // read meta file
                Map<String, MetadataMap> meta = ml.loadUri(mf.toURI());
                if (meta != null) {
                    // meta for file either directly in meta-tag
                    fileMeta = meta.get("");
                    if (fileMeta == null) {
                        // or under file's name
                        fileMeta = meta.get(dirent.getName());
                    }
                }
            } catch (Exception e) {
                logger.warn("error reading file .meta", e);
            }
        }
    }

    @Override
    public void checkMeta(DocuDirent file) {
        if (metaChecked) return;
        if (fileMeta == null) {
            // try to read metadata file
            readMeta(file);
            if (fileMeta == null) {
                // try directory metadata
                DocuDirectory dd = (DocuDirectory) file.getParent();
                // running checkmeta also distributes meta to files
                dd.checkMeta();
                if (fileMeta == null) {
                    if (dd.getMeta().getDirMeta() != null) {
                        fileMeta = dd.getMeta().getDirMeta();
                    } else {
                        // try parent directory metadata (just one level up)
                        DocuDirectory pdd = (DocuDirectory) dd.getParent();
                        if (pdd != null) {
                            pdd.checkMeta();
                            if (pdd.getMeta().getDirMeta() != null) {
                                fileMeta = pdd.getMeta().getDirMeta();
                            }
                        }
                    }
                }
            }
        }
        metaChecked = true;
    }

    @Override
    public MetadataMap getFileMeta() {
        return fileMeta;
    }

    @Override
    public void setFileMeta(MetadataMap fileMeta) {
        this.fileMeta = fileMeta;
    }

}
