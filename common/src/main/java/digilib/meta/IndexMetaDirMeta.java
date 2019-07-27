package digilib.meta;

/*
 * #%L
 * digilib-common
 * %%
 * Copyright (C) 2013 MPIWG Berlin
 * %%
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as 
 * published by the Free Software Foundation, either version 3 of the 
 * License, or (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Lesser Public License for more details.
 * 
 * You should have received a copy of the GNU General Lesser Public 
 * License along with this program.  If not, see
 * <http://www.gnu.org/licenses/lgpl-3.0.html>.
 * #L%
 * Author: Robert Casties (robcast@berlios.de)
 */

import java.io.File;
import java.io.IOException;
import java.util.Map;

import org.apache.log4j.Logger;

import digilib.io.DocuDirectory;
import digilib.io.DocuDirent;
import digilib.io.FsDocuDirectory;

/**
 * DirMeta implementation reading index.meta files.
 * 
 * @author casties
 *
 */
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
        File mf = new File(((FsDocuDirectory)dir).getDir(), "index.meta");
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
        readParentMeta((FsDocuDirectory)dir);
        metaChecked = true;
    }

    /**
     * Read metadata from all known parent directories.
     * @param dir the FsDocuDirectory
     *  
     */
    public void readParentMeta(FsDocuDirectory dir) {
        // check the parent directories for additional file meta
        FsDocuDirectory pd = (FsDocuDirectory) dir.getParent();
        String path = dir.getDir().getName();
        while (pd != null) {
            DocuDirectory dd = pd;
            dd.checkMeta();
            IndexMetaDirMeta dm = (IndexMetaDirMeta) dd.getMeta();
            if (dm.hasUnresolvedFileMeta()) {
                readFileMeta(dir, dm.getUnresolvedFileMeta(), path);
            }
            // prepend parent dir path
            path = pd.getDir().getName() + "/" + path;
            // become next parent
            pd = (FsDocuDirectory) pd.getParent();
        }
    }

    /**
     * Read metadata for the files in this directory.
     * 
     * Takes a Map with meta-information, adding the relative path before the
     * lookup.
     * 
     * @param dir the DocuDirectory
     * @param fileMeta the FileMeta
     * @param relPath the relPath
     */
    protected void readFileMeta(DocuDirectory dir, Map<String,MetadataMap> fileMeta, String relPath) {
        String path = (relPath != null) ? (relPath + "/") : "";
        // go through all file classes
        int ds = dir.size();
        if (ds == 0) {
            return;
        }
        // iterate through the list of files in this directory
        for (int i = 0; i < ds; ++i) {
            DocuDirent f = dir.get(i);
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

    /* (non-Javadoc)
     * @see digilib.meta.DirMeta#checkMeta(digilib.io.DocuDirectory)
     */
    public void checkMeta(DocuDirectory dir) {
        if (metaChecked) {
            return;
        } else {
            readMeta(dir);
        }
    }

    /* (non-Javadoc)
     * @see digilib.meta.DirMeta#getDirMeta()
     */
    public MetadataMap getDirMeta() {
        return dirMeta;
    }

    /* (non-Javadoc)
     * @see digilib.meta.DirMeta#setDirMeta(digilib.meta.MetadataMap)
     */
    public void setDirMeta(MetadataMap dirMeta) {
        this.dirMeta = dirMeta;
    }

    /**
     * @return has unresolved file meta
     */
    protected boolean hasUnresolvedFileMeta() {
        return (this.unresolvedFileMeta != null);
    }

    /**
     * @return the unresolved file meta
     */
    protected Map<String, MetadataMap> getUnresolvedFileMeta() {
        return this.unresolvedFileMeta;
    }

}
