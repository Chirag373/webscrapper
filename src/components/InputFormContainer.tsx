import React, { useState } from "react";
import {
    Autocomplete,
    Chip,
    TextField,
    Button,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Box,
} from "@mui/material";
import { handleFormSubmit } from "@/utils/formHandlers";


export default function InputFormContainer() {
    const [site, setSite] = useState('');
    const [email, setEmail] = useState([]);
    const [profession, setProfession] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [logic, setLogic] = useState('OR');

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        handleFormSubmit({ site, email, profession, city, state, logic });
    };

    return (
        <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
                maxWidth: 1000,
                margin: "auto",
                marginTop: "2rem",
                marginBottom: "2rem",
                padding: 3,
                display: "flex",
                flexDirection: "column",
                gap: 2,
                boxShadow: 3,
                borderRadius: 2,
            }}
        >
            <TextField
                id="site"
                label="Site"
                variant="outlined"
                value={site}
                onChange={(e) => setSite(e.target.value)}
                placeholder="e.g. site:instagram.com"
                fullWidth
            />

            <Autocomplete
                multiple
                freeSolo
                options={email}
                value={email}
                onChange={(event, newValue: any) => setEmail(newValue)}
                renderTags={(value, getTagProps) =>
                    value.map((option, index) => {
                        const { key, ...tagProps } = getTagProps({ index });
                        return (
                            <Chip
                                key={index}
                                label={option}
                                variant="outlined"
                                {...tagProps}
                            />
                        );
                    })
                }
                renderInput={(params) => (
                    <TextField
                        {...params}
                        variant="outlined"
                        label="Email Domains"
                        placeholder="Type and press enter (e.g. @gmail.com)"
                    />
                )}
            />

            <TextField
                id="profession"
                label="Profession"
                variant="outlined"
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
                placeholder="e.g. realtor"
                fullWidth
            />

            <TextField
                id="city"
                label="City"
                variant="outlined"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Dallas"
                fullWidth
            />

            <TextField
                id="state"
                label="State"
                variant="outlined"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="e.g. Texas"
                fullWidth
            />

            <FormControl fullWidth>
                <InputLabel id="logic-label">Logic</InputLabel>
                <Select
                    labelId="logic-label"
                    id="logic"
                    value={logic}
                    label="Logic"
                    onChange={(e) => setLogic(e.target.value)}
                >
                    <MenuItem value="OR">OR</MenuItem>
                    <MenuItem value="AND">AND</MenuItem>
                </Select>
            </FormControl>


            <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                sx={{ mt: 2 }}
            >
                Scrape and Download (.csv)
            </Button>
        </Box>
    );
}
