import { useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper
} from "@mui/material";

export default function ScrapedDataTable() {
    const [scrapedData, setScrapedData] = useState([
        { state: 'Texas', city: 'Dallas', profession: 'Realtor', email: 'john.doe@gmail.com', site: 'instagram.com', businessName: 'Dallas Homes', address: '123 Main St, Dallas, TX' },
        { state: 'California', city: 'Los Angeles', profession: 'Loan Officer', email: 'jane.smith@yahoo.com', site: 'linkedin.com', businessName: 'LA Loans', address: '456 Oak Ave, Los Angeles, CA' },
        { state: 'Florida', city: 'Miami', profession: 'Handyman', email: 'mike.fixit@msn.com', site: 'facebook.com', businessName: 'Miami Fixers', address: '789 Pine Rd, Miami, FL' },
        { state: 'New York', city: 'New York', profession: 'Electrician', email: 'sparky.nyc@gmail.com', site: 'google.com', businessName: 'NYC Electric', address: '101 Elm St, New York, NY' },
        { state: 'Illinois', city: 'Chicago', profession: 'Plumber', email: 'chicago.plumb@hotmail.com', site: 'instagram.com', businessName: 'Windy City Plumbing', address: '202 Birch Ln, Chicago, IL' },
        { state: 'Texas', city: 'Houston', profession: 'Realtor', email: 'houston.realty@yahoo.com', site: 'linkedin.com', businessName: 'Houston Properties', address: '303 Cedar Dr, Houston, TX' },
        { state: 'Georgia', city: 'Atlanta', profession: 'Home Improvement', email: 'atl.fix@gmail.com', site: 'facebook.com', businessName: 'Atlanta Renovations', address: '404 Maple St, Atlanta, GA' },
        { state: 'Arizona', city: 'Phoenix', profession: 'Mobile Mechanic', email: 'phx.mechanic@outlook.com', site: 'google.com', businessName: 'Phoenix Auto Care', address: '505 Palm Ave, Phoenix, AZ' },
        { state: 'Colorado', city: 'Denver', profession: 'Lawn Care', email: 'denver.green@aol.com', site: 'instagram.com', businessName: 'Denver Lawns', address: '606 Spruce St, Denver, CO' },
        { state: 'Nevada', city: 'Las Vegas', profession: 'Realtor', email: 'vegas.homes@gmail.com', site: 'linkedin.com', businessName: 'Vegas Realty', address: '707 Aspen Way, Las Vegas, NV' },
        { state: 'Washington', city: 'Seattle', profession: 'Loan Officer', email: 'seattle.loans@yahoo.com', site: 'facebook.com', businessName: 'Seattle Finance', address: '808 Willow Rd, Seattle, WA' },
        { state: 'Ohio', city: 'Columbus', profession: 'Electrician', email: 'columbus.elec@msn.com', site: 'google.com', businessName: 'Columbus Power', address: '909 Oakwood Dr, Columbus, OH' },
        { state: 'Massachusetts', city: 'Boston', profession: 'Handyman', email: 'boston.fixit@gmail.com', site: 'instagram.com', businessName: 'Boston Repairs', address: '1010 Chestnut St, Boston, MA' },
        { state: 'Oregon', city: 'Portland', profession: 'Plumber', email: 'portland.plumb@yahoo.com', site: 'linkedin.com', businessName: 'Portland Pipes', address: '1111 Alder Ln, Portland, OR' },
        { state: 'New Jersey', city: 'Newark', profession: 'Home Improvement', email: 'newark.reno@hotmail.com', site: 'facebook.com', businessName: 'Newark Upgrades', address: '1212 Birch St, Newark, NJ' }
    ]);

    return (
        <TableContainer component={Paper}>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell><strong>Business</strong></TableCell>
                        <TableCell><strong>Profession</strong></TableCell>
                        <TableCell><strong>Email</strong></TableCell>
                        <TableCell><strong>City</strong></TableCell>
                        <TableCell><strong>State</strong></TableCell>
                        <TableCell><strong>Address</strong></TableCell>
                        <TableCell><strong>Site</strong></TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {scrapedData.map((row, index) => (
                        <TableRow key={index}>
                            <TableCell>{row.businessName}</TableCell>
                            <TableCell>{row.profession}</TableCell>
                            <TableCell>{row.email}</TableCell>
                            <TableCell>{row.city}</TableCell>
                            <TableCell>{row.state}</TableCell>
                            <TableCell>{row.address}</TableCell>
                            <TableCell>@{row.site}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}
