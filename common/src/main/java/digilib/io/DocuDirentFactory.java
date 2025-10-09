package digilib.io;

/*-
 * #%L
 * digilib-common
 * %%
 * Copyright (C) 2001 - 2020 digilib Community
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
 */

import java.io.File;

import digilib.io.FileOps.FileClass;

/**
 * Static factory for DocuDirent instances used in DocuDirectory.
 *
 * @author casties
 */
public class DocuDirentFactory {

    public static Class<? extends DocuDirent> imageFileClass = ImageFileSet.class;
    public static Class<? extends DocuDirent> textFileClass = TextFile.class;

    /**
     * Factory for DocuDirents based on file class.
     * 
     * Returns an ImageFileSet, TextFile or SVGFile. scaleDirs are
     * only used for ImageFilesets.
     * 
     * @param fc the FileClass
     * @param file the File
     * @param scaleDirs
     *            optional additional parameters
     * @return the DocuDirent
     */
    public static DocuDirent getDocuDirentInstance(FileClass fc, File file, FsDirectory[] scaleDirs) {
        try {
            // what class of file do we have?
            switch (fc) {
            case IMAGE:
                // image file (set)
                return imageFileClass.getConstructor(File.class, FsDirectory[].class).newInstance(file, scaleDirs);

            case TEXT:
                // text file
                return textFileClass.getConstructor(File.class).newInstance(file);

            default:
                return null;
            }
        } catch (Exception e) {
            // anything to be done?
        }
        return null;
    }

    /**
     * Factory for DocuDirents based on file class.
     * 
     * Returns an ImageFileSet or TextFile. scaleDirs are
     * only used for ImageFilesets.
     * 
     * @param fc the FileClass
     * @param file the File
     * @param scaleDirs
     *            optional additional parameters
     * @return the DocuDirent
     */
    public static DocuDirent getInstance(FileClass fc, File file, FsDirectory[] scaleDirs) {
        return getDocuDirentInstance(fc, file, scaleDirs);
    }

    /**
     * Factory for DocuDirents based on file class.
     * 
     * Returns an ImageFileSet or TextFile. scaleDirs are
     * only used for ImageFilesets.
     * 
     * @param fc the FileClass
     * @param file the File
     * @param parent the parent
     * @param scaleDirs
     *            optional additional parameters
     * @return the DocuDirent
     */
    public static DocuDirent getInstance(FileClass fc, File file, DocuDirectory parent, FsDirectory[] scaleDirs) {
        DocuDirent f = getDocuDirentInstance(fc, file, scaleDirs);
        f.setParent(parent);
        return f;
    }

    public static void setDocuDirentClass(FileClass fc, Class<? extends DocuDirent> clazz) {
        // what class of file do we have?
        switch (fc) {
        case IMAGE:
            // image file (set)
            imageFileClass = clazz;
            break;

        case TEXT:
            // text file
            textFileClass = clazz;
            break;

        default:
            break;
        }
    }
    
}
