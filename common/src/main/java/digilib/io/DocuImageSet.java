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
	 * @param name the name
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
