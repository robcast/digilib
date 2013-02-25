package digilib.util;

/*
 * #%L
 * Parameter -- General digilib parameter class.
 * 
 * Digital Image Library servlet components
 * 
 * %%
 * Copyright (C) 2003 - 2013 Robert Casties (robcast@mail.berlios.de)
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
 * Created on 02.09.2003 by casties
 */

import java.io.File;
import java.io.IOException;


/**
 * General digilib parameter class.
 * 
 * @author casties
 *  
 */
public class Parameter {
	/** real value */
	protected Object value = null;

	/** default value */
	protected Object defval = null;

	/** parameter name (e.g. in config file) */
	protected String name = null;

	/** parameter type */
	protected int type = 0;

	/**
	 * Default constructor.
	 *  
	 */
	public Parameter() {
		super();
	}

	/**
	 * Constructor with name, default, and value.
	 * 
	 * @param value
	 * @param defval
	 */
	public Parameter(String name, Object defval, Object value) {
		this.name = name;
		this.value = value;
		this.defval = defval;
	}

	/**
	 * Constructor with name, default, value, and type.
	 * 
	 * @param value
	 * @param defval
	 */
	public Parameter(String name, Object defval, Object value, int type) {
		this.name = name;
		this.value = value;
		this.defval = defval;
		this.type = type;
	}

	/**
	 * Is the value valid.
	 * 
	 * @return
	 */
	public boolean hasValue() {
		return (value != null);
	}

	/**
	 * Try to set the value from a String.
	 * 
	 * Tries to convert the String to the same type as the default value. Sets
	 * the value anyway if the default is null. Returns if the value could be
	 * set.
	 * 
	 * @param val
	 * @return
	 */
	public boolean setValueFromString(String val) {
		if (val == null) {
			val = "";
		}
		// no default matches all
		if (defval == null) {
			this.value = val;
			return true;
		}
		Class<? extends Object> c = defval.getClass();
		// take String as is
		if (c == String.class) {
			this.value = val;
			return true;
		}
		// set File
		if (c == File.class) {
			this.value = new File(val);
			return true;
		}
		// set Options
		if (c == OptionsSet.class) {
			this.value = new OptionsSet(val);
			return true;
		}
		// set Boolean if string == "true"
		if (c == Boolean.class) {
			this.value = new Boolean(val.compareToIgnoreCase("true") == 0);
			return true;
		}
		try {
			// set Integer
			if (c == Integer.class) {
				this.value = new Integer(Integer.parseInt(val));
				return true;
			}
			// set Float
			if (c == Float.class) {
				this.value = new Float(Float.parseFloat(val));
				return true;
			}
		} catch (NumberFormatException e) {
		}
		// then it's unknown
		return false;
	}

	/**
	 * Get the default as Object.
	 * 
	 * @return
	 */
	public Object getDefault() {
		return defval;
	}

	/**
	 * Set the default.
	 * 
	 * @param defval
	 */
	public void setDefault(Object defval) {
		this.defval = defval;
	}

	/**
	 * Get the value as Object.
	 * 
	 * Returns the default if the value is not set.
	 * 
	 * @return
	 */
	public Object getValue() {
		return (value != null) ? value : defval;
	}

	public int getAsInt() {
		Integer i = (Integer) getValue();
		return (i != null) ? i.intValue() : 0;
	}

	public float getAsFloat() {
		Float f = (Float) getValue();
		return (f != null) ? f.floatValue() : 0f;
	}

	public String getAsString() {
		Object s = getValue();
		if (s == null) {
			return "";
		}
		if (s.getClass() == File.class) {
			try {
				return ((File) s).getCanonicalPath();
			} catch (IOException e) {
				return "ERR: " + s.toString();
			}
		}
		return s.toString();
	}

	public boolean getAsBoolean() {
		Boolean b = (Boolean) getValue();
		return (b != null) ? b.booleanValue() : false;
	}

	public String[] parseAsArray(String separator) {
		String s = getAsString();
		String[] sa = s.split(separator);
		return sa;
	}

	public float[] parseAsFloatArray(String separator) {
		String s = getAsString();
		String[] sa = s.split(separator);
		float[] fa = null;
		try {
			int n = sa.length;
			fa = new float[n];
			for (int i = 0; i < n; i++) {
				float f = Float.parseFloat(sa[i]);
				fa[i] = f;
			}
		} catch (Exception e) {
		}

		return fa;
	}

	/**
	 * Set the value.
	 * 
	 * @param value
	 */
	public void setValue(Object value) {
		this.value = value;
	}

	/**
	 * Set the value.
	 * 
	 * @param value
	 */
	public void setValue(int value) {
		this.value = new Integer(value);
	}

	/**
	 * Set the value.
	 * 
	 * @param value
	 */
	public void setValue(float value) {
		this.value = new Float(value);
	}

	/**
	 * @return
	 */
	public String getName() {
		return name;
	}

	/**
	 * @param name
	 */
	public void setName(String name) {
		this.name = name;
	}

	/**
	 * @return
	 */
	public int getType() {
		return type;
	}

	/**
	 * @param type
	 */
	public void setType(int type) {
		this.type = type;
	}

}
