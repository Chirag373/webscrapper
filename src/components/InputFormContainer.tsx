import React, { useState } from "react";
import styles from "../styles/inputform.module.css";
import { handleFormSubmit } from "@/utils/formHandlers";

export default function InputFormContainer() {
    const [site, setSite] = useState('');
    const [email, setEmail] = useState('');
    const [profession, setProfession] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [logic, setLogic] = useState('OR');

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        handleFormSubmit({
            site,
            email,
            profession,
            city,
            state,
            logic
        });
    };

    return (
        <div className={styles.formContainer}>
            <form className={styles.form} onSubmit={handleSubmit}>
                <input
                    id="site"
                    type="text"
                    value={site}
                    onChange={(e) => setSite(e.target.value)}
                    placeholder="Site (e.g. site:instagram.com)"
                    className={styles.inputField}
                />
                <input
                    id="email"
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email Domain (e.g. @gmail.com)"
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
                <button type="submit" className={styles.submitButton}>
                    Scrape and Download (in .csv)
                </button>
            </form>
        </div>
    );
}
