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

import digilib.io.DocuDirectory;

/**
 * Interface for directory-based metadata.
 * 
 * @author casties
 *
 */
public interface DirMeta {

    /**
     * read and store metadata for this directory.
     * @param dir
     */
    public void readMeta(DocuDirectory dir);

    /**
     * check and process metadata for this directory.
     * 
     * @param dir
     */
    public void checkMeta(DocuDirectory dir);

    /**
     * returns metadata for this directory
     * 
     * @return
     */
    public MetadataMap getDirMeta();

    /**
     * sets the metadata for this directory.
     * 
     * @param dirMeta
     */
    public void setDirMeta(MetadataMap dirMeta);

}
