/**
 * 
 */
package digilib.meta;

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

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;


/**
 * Static factory for FileMeta and DirMeta implementations.
 * 
 * @author casties
 * 
 */
public class MetaFactory {
    /** Log4J logger */
    protected static final Logger logger = LoggerFactory.getLogger(MetaFactory.class);

    /** DirMeta implementation class */
    protected static Class<? extends DirMeta> dirMetaClass = SimpleDirMeta.class;

    /** FileMeta implementation class */
    protected static Class<? extends FileMeta> fileMetaClass = SimpleFileMeta.class;

    public static FileMeta getFileMetaInstance() {
        if (fileMetaClass == null) {
            logger.warn("No FileMeta class!");
            return null;
        }
        FileMeta mo = null;
        try {
            mo = fileMetaClass.getConstructor().newInstance();
        } catch (Exception e) {
            logger.error("Unable to create FileMeta instance!", e);
        }
        return mo;
    }
    
    public static DirMeta getDirMetaInstance() {
        if (dirMetaClass == null) {
            logger.warn("No DirMeta class!");
            return null;
        }
        DirMeta mo = null;
        try {
            mo = dirMetaClass.getConstructor().newInstance();
        } catch (Exception e) {
            logger.error("Unable to create DirMeta instance!", e);
        }
        return mo;
    }

    /**
     * @param dirMetaClass the dirMetaClass to set
     */
    public static void setDirMetaClass(Class<? extends DirMeta> dirMetaClass) {
        MetaFactory.dirMetaClass = dirMetaClass;
    }

    /**
     * @param fileMetaClass the fileMetaClass to set
     */
    public static void setFileMetaClass(Class<? extends FileMeta> fileMetaClass) {
        MetaFactory.fileMetaClass = fileMetaClass;
    }
    

}
