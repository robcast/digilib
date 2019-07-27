package digilib.io;

/*-
 * #%L
 * digilib-common
 * %%
 * Copyright (C) 2001 - 2019 digilib Community
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

import digilib.meta.FileMeta;

/**
 * Interface for an object that represents the content of a DocuDirectory.
 *  
 * @author casties
 *
 */
public interface DocuDirent extends Comparable<Object> {

    /**
     * The name of the file.
     * 
     * If this is a Fileset, the method returns the name of the default file
     * (for image filesets the highest resolution file).
     * 
     * @return the name
     */
    public abstract String getName();

    /**
     * Returns the parent Directory.
     * 
     * @return the DocuDirectory
     */
    public abstract DocuDirectory getParent();

    /**
     * Sets the parent Directory.
     * 
     * @param parent
     *            The parent to set
     */
    public abstract void setParent(DocuDirectory parent);

    /**
     * Reads meta-data for this Fileset if there is any.
     *  
     */
    public abstract void readMeta();

    /**
     * Checks metadata and does something with it.
     *  
     */
    public abstract void checkMeta();

    /**
     * Returns the meta-data for this file(set).
     * @return the FileMeta
     */
    public abstract FileMeta getMeta();

    /**
     * Sets the meta-data for this file(set).
     * 
     * @param fileMeta
     *            The fileMeta to set
     */
    public abstract void setMeta(FileMeta fileMeta);

    /** 
     * Comparator using the file name.
     * Compares to a String (for binarySearch)
     * or to another DocuDirent (for sort).
     * 
     * @param arg0 the other Object
     * @see java.lang.Comparable#compareTo(java.lang.Object)
     */
    public abstract int compareTo(Object arg0);

}
