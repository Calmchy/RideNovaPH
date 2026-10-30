// "Rent my unit": the owner's own page. Switch a vehicle on for rent, set the price per day and the
// terms & conditions, and handle the requests people send. (Separate from "Hire a driver".)
import { Head } from '@inertiajs/react';
import { PageHeader, Panel } from '@/components/kit';
import { MyVehiclesPanel, RentalRequestsTable } from '@/components/rental-panels';
import type { MyVehicle, RentalRow } from '@/components/rental-panels';

type Props = {
    my_vehicles: MyVehicle[];
    incoming_rentals: RentalRow[];
};

export default function DriverRentals({ my_vehicles, incoming_rentals }: Props) {
    return (
        <>
            <Head title="Rent my unit" />
            <PageHeader
                title="Rent my unit"
                description="Let someone rent your vehicle and drive it themselves. You set the price per day and your terms and conditions."
            />
            <MyVehiclesPanel vehicles={my_vehicles} />
            <Panel title="Rental requests for my vehicles">
                <RentalRequestsTable rows={incoming_rentals} who="Renter" />
            </Panel>
        </>
    );
}
