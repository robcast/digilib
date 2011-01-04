package digilib.io;

import java.io.File;

public interface DocuDirent extends Comparable<Object> {

    /**
     * Checks metadata and does something with it.
     *  
     */
    public abstract void checkMeta();

    /**
     * gets the (default) File
     * 
     * @return
     */
    public abstract File getFile();

    /**
     * Reads meta-data for this Fileset if there is any.
     *  
     */
    public abstract void readMeta();

    /**
     * The name of the file.
     * 
     * If this is a Fileset, the method returns the name of the default file
     * (for image filesets the highest resolution file).
     * 
     * @return
     */
    public abstract String getName();

    /**
     * Returns the parent Directory.
     * 
     * @return DocuDirectory
     */
    public abstract Directory getParent();

    /**
     * Sets the parent Directory.
     * 
     * @param parent
     *            The parent to set
     */
    public abstract void setParent(Directory parent);

    /**
     * Returns the meta-data for this file(set).
     * 
     * @return HashMap
     */
    public abstract MetadataMap getFileMeta();

    /**
     * Sets the meta-data for this file(set) .
     * 
     * @param fileMeta
     *            The fileMeta to set
     */
    public abstract void setFileMeta(MetadataMap fileMeta);

    /**
     * @return
     */
    public abstract boolean isMetaChecked();

    /** Comparator using the file name.
     * Compares to a String (for binarySearch)
     * or to another DocuDirent (for sort)
     * 
     * @see java.lang.Comparable#compareTo(java.lang.Object)
     */
    public abstract int compareTo(Object arg0);

}