/**
 * 
 */
package digilib.meta;

import org.apache.log4j.Logger;


/**
 * @author casties
 * 
 */
public class MetaFactory {
    /** Log4J logger */
    protected static Logger logger = Logger.getLogger(MetaFactory.class);

    /** DirMeta implementation class */
    protected static Class<DirMeta> dirMetaClass;

    /** FileMeta implementation class */
    protected static Class<FileMeta> fileMetaClass;

    public static FileMeta getFileMetaInstance() {
        FileMeta mo = null;
        try {
            mo = fileMetaClass.newInstance();
        } catch (Exception e) {
            logger.error("Unable to create FileMeta instance!", e);
        }
        return mo;
    }
    
    public static DirMeta getDirMetaInstance() {
        DirMeta mo = null;
        try {
            mo = dirMetaClass.newInstance();
        } catch (Exception e) {
            logger.error("Unable to create DirMeta instance!", e);
        }
        return mo;
    }

    /**
     * @param dirMetaClass the dirMetaClass to set
     */
    public static void setDirMetaClass(Class<DirMeta> dirMetaClass) {
        MetaFactory.dirMetaClass = dirMetaClass;
    }

    /**
     * @param fileMetaClass the fileMetaClass to set
     */
    public static void setFileMetaClass(Class<FileMeta> fileMetaClass) {
        MetaFactory.fileMetaClass = fileMetaClass;
    }
    

}
