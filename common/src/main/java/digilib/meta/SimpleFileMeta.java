package digilib.meta;

/*-
 * #%L
 * digilib-common
 * %%
 * Copyright (C) 2001 - 2020 digilib Community
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

import digilib.io.DocuDirent;

/**
 * Minimal FileMeta class just holding a MetadataMap.
 * 
 * @author casties
 *
 */
public class SimpleFileMeta implements FileMeta {

    protected MetadataMap meta = null;

    public SimpleFileMeta() {
        super();
        this.meta = new MetadataMap();
    }

    /**
     * Creates FileMeta with the given MetadataMap.
     */
    public SimpleFileMeta(MetadataMap meta) {
        super();
        this.meta = meta;
    }

    @Override
    public void readMeta(DocuDirent file) {
        // no implementation here
    }

    @Override
    public void checkMeta(DocuDirent file) {
      // no implementation here
    }

    @Override
    public MetadataMap getFileMeta() {
        return meta;
    }

    @Override
    public void setFileMeta(MetadataMap fileMeta) {
        meta = fileMeta;
    }

}
