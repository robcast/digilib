/**
 * 
 */
package digilib.io;

import java.io.File;

import digilib.meta.FileMeta;

/**
 * @author casties
 *
 */
public class ImageUrlSet extends ImageSet implements DocuDirent {

	protected String name;
	protected String url;
	
	/**
	 * 
	 */
	public ImageUrlSet(String name, String url) {
		super();
		this.name = name;
		this.url = url;
	}

	/* (non-Javadoc)
	 * @see digilib.io.DocuDirent#getFile()
	 */
	@Override
	public File getFile() {
		return null;
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
		// no parents
		return null;
	}

	/* (non-Javadoc)
	 * @see digilib.io.DocuDirent#setParent(digilib.io.Directory)
	 */
	@Override
	public void setParent(DocuDirectory parent) {
		// no parents
	}

	/* (non-Javadoc)
	 * @see digilib.io.DocuDirent#readMeta()
	 */
	@Override
	public void readMeta() {
		// TODO Auto-generated method stub

	}

	/* (non-Javadoc)
	 * @see digilib.io.DocuDirent#getMeta()
	 */
	@Override
	public FileMeta getMeta() {
		// TODO Auto-generated method stub
		return null;
	}

	/* (non-Javadoc)
	 * @see digilib.io.DocuDirent#setMeta(digilib.meta.FileMeta)
	 */
	@Override
	public void setMeta(FileMeta fileMeta) {
		// TODO Auto-generated method stub

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
