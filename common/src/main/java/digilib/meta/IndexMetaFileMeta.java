/**
 * 
 */
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
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import digilib.io.DocuDirectory;
import digilib.io.DocuDirent;
import digilib.io.ImageFileSet;

/**
 * FileMeta implementation reading index.meta files.
 * 
 * @author casties
 * 
 */
public class IndexMetaFileMeta implements FileMeta {
    protected static final Logger logger = LoggerFactory.getLogger(IndexMetaFileMeta.class);

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
        File f = ((ImageFileSet) dirent).getFile();
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
                            if (fileMeta == null) {
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
