/* DocuFileset -- digilib image file info class.

  Digital Image Library servlet components

  Copyright (C) 2003 Robert Casties (robcast@mail.berlios.de)

  This program is free software; you can redistribute  it and/or modify it
  under  the terms of  the GNU General  Public License as published by the
  Free Software Foundation;  either version 2 of the  License, or (at your
  option) any later version.
   
  Please read license.txt for the full details. A copy of the GPL
  may be found at http://www.gnu.org/copyleft/lgpl.html

  You should have received a copy of the GNU General Public License
  along with this program; if not, write to the Free Software
  Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307 USA

 */
package digilib.io;

import java.util.Collection;
import java.util.Hashtable;
import java.util.Vector;

/**
 * @author casties
 */
public class DocuFileset extends Vector {

	// metadata
	private Hashtable fileMeta = null;
	// parent directory
	private DocuDirectory parent = null;

	public DocuFileset(int initialCapacity, int capacityIncrement) {
		super(initialCapacity, capacityIncrement);
	}

	public DocuFileset(int initialCapacity) {
		super(initialCapacity);
	}

	public DocuFileset() {
		super();
	}

	public DocuFileset(Collection c) {
		super(c);
	}

	/* (non-Javadoc)
	 * @see java.util.Collection#add(java.lang.Object)
	 */
	public synchronized boolean add(DocuFile f) {
		f.setParent(this);
		return super.add(f);
	}

	public void readMeta() {
		// check for file metadata...
	}

	public String getName() {
		if (this.elementCount > 0) {
			return ((DocuFile) firstElement()).getName();
		}
		return null;
	}
	/**
	 * @return DocuDirectory
	 */
	public DocuDirectory getParent() {
		return parent;
	}

	/**
	 * Sets the parent.
	 * @param parent The parent to set
	 */
	public void setParent(DocuDirectory parent) {
		this.parent = parent;
	}

}
