/* DigilibWorker.java -- image operation worker
 * 
 * Digital Image Library servlet components
 * 
 * Copyright (C) 2004 Robert Casties (robcast@mail.berlios.de)
 * 
 * This program is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the Free
 * Software Foundation; either version 2 of the License, or (at your option)
 * any later version.
 * 
 * Please read license.txt for the full details. A copy of the GPL may be found
 * at http://www.gnu.org/copyleft/lgpl.html
 * 
 * You should have received a copy of the GNU General Public License along with
 * this program; if not, write to the Free Software Foundation, Inc., 59 Temple
 * Place, Suite 330, Boston, MA 02111-1307 USA
 *  
 * Created on 18.10.2004
 */
package digilib.servlet;

import java.util.concurrent.Semaphore;

import org.apache.log4j.Logger;

import digilib.image.DocuImage;

/**
 * image operation worker.
 * 
 * @author casties
 */
public abstract class DigilibWorker1 {

	protected static Logger logger = Logger.getLogger(DigilibWorker1.class);

	private static int maxRunningThreads = 0;

	private static int runningThreads = 0;

	private static int waitingThreads = 0;

	private static int maxWaitingThreads = 0;

	public static Semaphore sem = new Semaphore(2, true);

	protected Throwable error;

	/**
	 * @param job
	 */
	public DigilibWorker1() {
		super();
		error = null;
	}

	public abstract DocuImage render() throws Exception;

	public abstract void write(DocuImage img) throws Exception;

	/**
	 * Do the work.
	 */
	public void run() {
		logger.debug((++waitingThreads) + " waiting threads");
		DocuImage img = null;
		try {
			sem.acquire();
			waitingThreads--;
		} catch (InterruptedException e) {
			error = e;
			waitingThreads--;
			// should we reinterrupt?
			return;
		}
		logger.debug((++runningThreads) + " running threads");
		try {
			/* 
			 * do rendering under the semaphore 
			 */
			img = render();
		} catch (Throwable e) {
			error = e;
			logger.error(e);
		} finally {
			runningThreads--;
			sem.release();
		}
		/* 
		 * write the result without semaphore
		 */
		if (!hasError()) {
			try{
				write(img);
			} catch (Throwable e) {
				error = e;
				logger.error(e);
			}
		}
	}

	/**
	 * Returns the name of this thread.
	 * 
	 * @return
	 */
	public String getName() {
		return Thread.currentThread().getName();
	}

	/** Returns if the worker could run (i.e. is not overloaded).
	 * 
	 * @return
	 */
	public static boolean canRun() {
		return ((DigilibWorker1.maxWaitingThreads == 0) || (DigilibWorker1.getNumWaiting() <= DigilibWorker1.maxWaitingThreads));
	}

	/**
	 * returns if an error occurred.
	 * 
	 * @return
	 */
	public boolean hasError() {
		return (error != null);
	}

	/**
	 * @return Returns the error.
	 */
	public Throwable getError() {
		return error;
	}

	/**
	 * @return Returns the semaphore.
	 */
	public static Semaphore getSemaphore() {
		return sem;
	}

	/**
	 * @param sem
	 *            The semaphore to set.
	 */
	public static void setSemaphore(Semaphore sem) {
		DigilibWorker1.sem = sem;
	}

	public static void setSemaphore(int maxrun, boolean fair) {
		sem = new Semaphore(maxrun, fair);
		maxRunningThreads = maxrun;
	}

	/**
	 * The number of currently running threads (approximate).
	 * 
	 * @return
	 */
	public static int getNumRunning() {
		return (maxRunningThreads - sem.availablePermits());
	}

	/**
	 * The number of currently waiting threads (approximate).
	 * 
	 * @return
	 */
	public static int getNumWaiting() {
		return sem.getQueueLength();
	}

	/**
	 * @return Returns the maxWaitingThreads.
	 */
	public static int getMaxWaitingThreads() {
		return maxWaitingThreads;
	}

	/**
	 * @param maxWaitingThreads The maxWaitingThreads to set.
	 */
	public static void setMaxWaitingThreads(int maxWaitingThreads) {
		DigilibWorker1.maxWaitingThreads = maxWaitingThreads;
	}

	public static int getMaxRunningThreads() {
		return maxRunningThreads;
	}

	public static void setMaxRunningThreads(int maxRunningThreads) {
		DigilibWorker1.maxRunningThreads = maxRunningThreads;
	}
}
