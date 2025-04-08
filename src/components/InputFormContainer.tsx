import React from "react";
import { useState } from "react";
import styles from "../styles/inputform.module.css"

export default function InputFormContainer() {
    const [site, setSite] = useState('');
    const [email1, setEmail1] = useState('');
    const [email2, setEmail2] = useState('');
    const [email3, setEmail3] = useState('');
    const [profession, setProfession] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [logic, setLogic] = useState('OR');

    return (
        <div className={styles.formContainer}>
            <form className={styles.form}>
                <input
                    id="site"
                    type="text"
                    value={site}
                    onChange={(e) => setSite(e.target.value)}
                    placeholder="Site (e.g. site:instagram.com)"
                    className={styles.inputField}
                />
                <input
                    id="email1"
                    type="text"
                    value={email1}
                    onChange={(e) => setEmail1(e.target.value)}
                    placeholder="Email Domain (e.g. @gmail.com)"
                    className={styles.inputField}
                />

                <input
                    id="email2"
                    type="text"
                    value={email2}
                    onChange={(e) => setEmail2(e.target.value)}
                    placeholder="Email Domain (e.g. @yahoo.com)"
                    className={styles.inputField}
                />


                <input
                    id="email3"
                    type="text"
                    value={email3}
                    onChange={(e) => setEmail3(e.target.value)}
                    placeholder="Email Domain (e.g. @msn.com)"
                    className={styles.inputField}
                />
                <input
                    id="profession"
                    type="text"
                    value={profession}
                    onChange={(e) => setProfession(e.target.value)}
                    placeholder="Profession (e.g. realtor)"
                    className={styles.inputField}
                />
                <input
                    id="city"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City (e.g. Dallas)"
                    className={styles.inputField}
                />
                <input
                    id="state"
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="State (e.g. Texas)"
                    className={styles.inputField}
                />
                <select
                    id="logic"
                    value={logic}
                    onChange={(e) => setLogic(e.target.value)}
                    className={styles.selectField}
                >
                    <option value="OR">OR</option>
                    <option value="AND">AND</option>
                </select>
                <button type="submit" className={styles.submitButton}>Scrape</button>
            </form>
        </div>
    )
}