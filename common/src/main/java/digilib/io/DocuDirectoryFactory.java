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

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import digilib.conf.DigilibConfiguration;
import digilib.io.FileOps.FileClass;

/**
 * Static factory for DocuDirectory implementations.
 * 
 * @author casties
 * 
 */
public class DocuDirectoryFactory {

    /** Log4J logger */
    protected static Logger logger = LoggerFactory.getLogger(DocuDirectoryFactory.class);
    
    /** digilib config instance */
    protected static DigilibConfiguration dlConfig;

    /** DocuDirectory implementation class */
    protected static Class<DocuDirectory> docuDirClass;

    /**
     * Returns a unconfigured DocuDirectory instance.
     * @return the DocuDirectory
     */
    public static DocuDirectory getInstance() {
        DocuDirectory dd = null;
        try {
            dd = docuDirClass.getConstructor().newInstance();
        } catch (Exception e) {
            logger.error("Unable to create DocuDirectory instance!", e);
        }
        return dd;
    }

    /**
     * Returns a DocuDirectory instance with the given path and FileClass.
     *  
     * @param path the path
     * @param fileClass the FileClass
     * @return the DocuDirectory
     */
    public static DocuDirectory getDocuDirectoryInstance(String path, FileClass fileClass) {
        DocuDirectory dd = getInstance();
        dd.configure(path, fileClass, dlConfig);
        return dd;        
    }
    
    /**
     * Returns a DocuDirectory instance with the given path and DocuDirCache.
     *  
     * @param path the path
     * @param cache the DocuDirCache
     * @return the DocuDirectory
     */
    public static DocuDirectory getDocuDirectoryInstance(String path, DocuDirCache cache) {
        DocuDirectory dd = getInstance();
        dd.configure(path, cache.getFileClass(), dlConfig);
        return dd;        
    }
    
    /**
     * @param dirClass the DocuDirectory class to set
     */
    public static void setDocuDirectoryClass(Class<DocuDirectory> dirClass) {
        DocuDirectoryFactory.docuDirClass = dirClass;
    }

    /**
     * @param dlConfig the DigilibConfiguration
     */
    public static void setDigilibConfig(DigilibConfiguration dlConfig) {
        DocuDirectoryFactory.dlConfig = dlConfig;
    }


}
