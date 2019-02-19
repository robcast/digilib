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

import digilib.io.DocuDirent;

/**
 * Interface for file-based metadata.
 * 
 * @author casties
 *
 */
public interface FileMeta {

    /**
     * read and store metadata for this file.
     * 
     * @param file
     */
    public void readMeta(DocuDirent file);

    /**
     * check and process metadata for this file.
     * 
     * @param file
     */
    public void checkMeta(DocuDirent file);

    /**
     * returns a MetadataMap with metadata for this File.
     * 
     * @return
     */
    public MetadataMap getFileMeta();

    /**
     * set metadata for this file.
     * @param fileMeta
     */
    public void setFileMeta(MetadataMap fileMeta);

}
