/**
 * 
 */
package digilib.meta;

import java.io.File;
import java.io.IOException;
import java.util.Map;

import org.apache.log4j.Logger;

import digilib.io.Directory;
import digilib.io.DocuDirectory;
import digilib.io.DocuDirent;
import digilib.io.FileOps.FileClass;

/**
 * @author casties
 *
 */
public class IndexMetaDirMeta implements DirMeta {
    /** Log4J logger */
    protected static Logger logger = Logger.getLogger(IndexMetaDirMeta.class);

    private MetadataMap dirMeta = null;

    /** state of metadata is valid */
    private boolean metaChecked = false;

    /** unresolved file metadata */
    private Map<String, MetadataMap> unresolvedFileMeta = null;


    @Override
    public void readMeta(DocuDirectory dir) {
        // read directory metadata
        File mf = new File(dir.getDir(), "index.meta");
        if (mf.canRead()) {
            IndexMetaAuthLoader ml = new IndexMetaAuthLoader();
            try {
                // read directory meta file
                Map<String, MetadataMap> meta = ml.loadUri(mf.toURI());
                if (meta == null) {
                    return;
                }
                // meta for the directory itself is in the "" bin
                dirMeta = meta.remove("");
                // read meta for files in this directory
                readFileMeta(dir, meta, null);
                // is there meta for other files left?
                if (meta.size() > 0) {
                    unresolvedFileMeta = meta;
                }
            } catch (IOException e) {
                logger.warn("error reading index.meta", e);
            }
        }
        readParentMeta(dir);
        metaChecked = true;
    }

    /**
     * Read metadata from all known parent directories.
     * @param dir 
     *  
     */
    public void readParentMeta(DocuDirectory dir) {
        // check the parent directories for additional file meta
        Directory dd = dir.getParent();
        String path = dir.getDir().getName();
        while (dd != null) {
            IndexMetaDirMeta dm = (IndexMetaDirMeta) ((DocuDirectory) dd).getMeta();
            if (dm.hasUnresolvedFileMeta()) {
                readFileMeta(dir, dm.getUnresolvedFileMeta(), path);
            }
            // prepend parent dir path
            path = dd.getDir().getName() + "/" + path;
            // become next parent
            dd = dd.getParent();
        }
    }

    /**
     * Read metadata for the files in this directory.
     * 
     * Takes a Map with meta-information, adding the relative path before the
     * lookup.
     * @param dir 
     * 
     * @param fileMeta
     * @param relPath
     * @param fc
     *            fileClass
     */
    protected void readFileMeta(DocuDirectory dir, Map<String,MetadataMap> fileMeta, String relPath) {
        if (dir.size() == 0) {
            // there are no files
            return;
        }
        String path = (relPath != null) ? (relPath + "/") : "";
        // go through all file classes
        for (FileClass fc: FileClass.values()) {
            int ds = dir.size(fc);
            if (ds == 0) {
                continue;
            }
            // iterate through the list of files in this directory
            for (int i = 0; i < ds; ++i) {
                DocuDirent f = dir.get(i, fc);
                // prepend path to the filename
                String fn = path + f.getName();
                // look up meta for this file and remove from dir
                MetadataMap meta = fileMeta.remove(fn);
                if (meta != null) {
                    // store meta in file
                    f.getMeta().setFileMeta(meta);
                }
            }
        }
    }

    /**
     * Checks metadata
     *  
     */
    public void checkMeta(DocuDirectory dir) {
        if (metaChecked) {
            return;
        } else {
            readMeta(dir);
        }
    }

    /**
     * @return Hashtable
     */
    public MetadataMap getDirMeta() {
        return dirMeta;
    }

    /**
     * Sets the dirMeta.
     * 
     * @param dirMeta
     *            The dirMeta to set
     */
    public void setDirMeta(MetadataMap dirMeta) {
        this.dirMeta = dirMeta;
    }

    protected boolean hasUnresolvedFileMeta() {
        return (this.unresolvedFileMeta != null);
    }

    protected Map<String, MetadataMap> getUnresolvedFileMeta() {
        return this.unresolvedFileMeta;
    }

    @Override
    public boolean isChecked() {
        return this.metaChecked;
    }




}
