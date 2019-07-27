package digilib.io;

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
