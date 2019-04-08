package digilib.io;

import java.io.File;

/**
 * Filesystem-based DocuDirectory implementation.
 * 
 * @author casties
 *
 */
public abstract class FsDocuDirectory extends DocuDirectory {

	protected Directory dir = null;

	public FsDocuDirectory() {
		super();
		dir = new Directory();
	}

    /* (non-Javadoc)
     * @see digilib.io.DocuDirectory#readDir()
     */
    @Override
	public abstract boolean readDir();
    
	/**
	 * Returns the parent filesystem Directory.
	 * 
	 * @return
	 */
	public Directory getParentDirectory() {
		return dir.getParent();
	}

	/**
	 * Returns the filesystem File for this directory.
	 * @return
	 */
	public File getDir() {
		return dir.dir;
	}

	/**
	 * @return
	 */
	public String[] getFilenames() {
		return dir.getFilenames();
	}

	@Override
	public String findParentName(String fn) {
		return FileOps.parent(fn);
	}

	@Override
	public String findFilename(String fn) {
		return FileOps.filename(fn);
	}

}