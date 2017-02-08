package digilib.util;

import java.util.EnumSet;
import java.util.StringTokenizer;

import org.apache.log4j.Logger;

import digilib.conf.DigilibOption;

/**
 * @author casties
 *
 */
public class OptionsSet {

	/** content EnumSet */
	private EnumSet<DigilibOption> options;
	
    /** logger */
    protected static final Logger logger = Logger.getLogger(OptionsSet.class);

	/** String separating options in a String. */
	protected String optionSep = ",";
	
	public OptionsSet() {
		options = EnumSet.noneOf(DigilibOption.class);
	}

	/** Constructor with String of options.
	 * @param s
	 */
	public OptionsSet(String s) {
		options = EnumSet.noneOf(DigilibOption.class);
		parseString(s);
	}

	/** Adds all options from String to Set.
	 * @param s
	 */
	public void parseString(String s) {
		if (s != null) {
			StringTokenizer i = new StringTokenizer(s, optionSep);
			while (i.hasMoreTokens()) {
				String opt = i.nextToken();
				try {
					DigilibOption dlOpt = DigilibOption.valueOf(opt);
					options.add(dlOpt);
				} catch (IllegalArgumentException e) {
					logger.warn("Ignored unknown digilib option: "+opt); 
				}
			}
		}
	}
	
	/**
	 * Set the option opt.
	 * 
	 * @param opt
	 * @return
	 */
	public boolean setOption(DigilibOption opt) {
	    return options.add(opt);
	}
	
	/**
	 * Return if the option opt is set.
	 * 
	 * @param opt
	 * @return
	 */
	public boolean hasOption(DigilibOption opt) {
		return options.contains(opt);
	}

	/* (non-Javadoc)
	 * @see java.util.AbstractCollection#toString()
	 */
	public String toString() {
		StringBuffer b = new StringBuffer();
		for (DigilibOption s: options) {
			if (b.length() > 0) {
				b.append(optionSep);
			}
			b.append(s);			
		}
		return b.toString();
	}
	
	
	/**
	 * @return the options
	 */
	public EnumSet<DigilibOption> getOptions() {
		return options;
	}

	/**
	 * @param options the options to set
	 */
	public void setOptions(EnumSet<DigilibOption> options) {
		this.options = options;
	}

	public String getOptionSep() {
		return optionSep;
	}

	public void setOptionSep(String optionSep) {
		this.optionSep = optionSep;
	}

}
