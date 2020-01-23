package digilib.io;

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
    public static Class<? extends DocuDirent> svgFileClass = SVGFile.class;

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

            case SVG:
                // text file
                return svgFileClass.getConstructor(File.class).newInstance(file);

            default:
                return null;
            }
        } catch (Exception e) {
            // anything to be done?
        }
        return null;
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

        case SVG:
            // text file
            svgFileClass = clazz;
            break;
            
        default:
            break;
        }
    }
    
}
