package digilib.io;

import digilib.meta.FileMeta;

/**
 * ImageSet that is also a DocuDirent that can be put in a DocuDirectory.
 * 
 * @author casties
 *
 */
public class DocuImageSet extends ImageSet implements DocuDirent {

    /** the "file" name */
	protected String name;
    /** the FileMeta instance */
    protected FileMeta meta = null;
    /** is our metadata valid */
    protected boolean metaChecked = false;
    /** the parent DocuDirectory */
    protected DocuDirectory parent = null;
	
	/**
	 * 
	 */
	public DocuImageSet(String name) {
		super();
		this.name = name;
	}

	/* (non-Javadoc)
	 * @see digilib.io.DocuDirent#getName()
	 */
	@Override
	public String getName() {
		return name;
	}

	/* (non-Javadoc)
	 * @see digilib.io.DocuDirent#getParent()
	 */
	@Override
	public DocuDirectory getParent() {
		return parent;
	}

	/* (non-Javadoc)
	 * @see digilib.io.DocuDirent#setParent(digilib.io.Directory)
	 */
	@Override
	public void setParent(DocuDirectory parent) {
		this.parent = parent;
	}

	/* (non-Javadoc)
	 * @see digilib.io.DocuDirent#getMeta()
	 */
	@Override
	public FileMeta getMeta() {
		return meta;
	}

	/* (non-Javadoc)
	 * @see digilib.io.DocuDirent#setMeta(digilib.meta.FileMeta)
	 */
	@Override
	public void setMeta(FileMeta fileMeta) {
	    this.meta = fileMeta;	
	}

    /* (non-Javadoc)
     * @see digilib.io.DocuDirent#readMeta()
     */
    @Override
    public void readMeta() {
        meta.readMeta(this);
    }

	/* (non-Javadoc)
	 * @see digilib.io.DocuDirent#compareTo(java.lang.Object)
	 */
	@Override
	public int compareTo(Object arg0) {
		if (arg0 instanceof DocuDirentImpl) {
		    return getName().compareTo(((DocuDirent) arg0).getName());
		} else {
		    return getName().compareTo((String) arg0);
		}
	}

}
