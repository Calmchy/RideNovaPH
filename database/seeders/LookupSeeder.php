<?php

namespace Database\Seeders;

use App\Models\AnnouncementCategory;
use App\Models\ChatbotIntent;
use App\Models\City;
use App\Models\IdType;
use App\Models\Province;
use App\Models\VehicleMake;
use App\Models\VehicleModel;
use Illuminate\Database\Seeder;

/**
 * Reference data. Safe to run more than once (uses firstOrCreate).
 * Roles are created by their migration, not here.
 */
class LookupSeeder extends Seeder
{
    public function run(): void
    {
        foreach ([
            'Philippine National ID (PhilSys)', 'Passport', "Driver's License", 'UMID',
            'SSS ID', 'Postal ID', "Voter's ID", 'PRC ID', 'School ID', 'Senior Citizen ID',
        ] as $name) {
            IdType::firstOrCreate(['name' => $name]);
        }

        // Eastern Visayas (Region 8) to start; add more provinces/cities as you grow.
        // [lat, lng] centres let the booking map open on the right place.
        $places = [
            'Leyte' => ['Tacloban City' => [11.2443, 125.0039], 'Ormoc City' => [11.0064, 124.6075], 'Baybay City' => [10.6783, 124.8000], 'Abuyog' => [10.7438, 125.0117]],
            'Southern Leyte' => ['Maasin City' => [10.1324, 124.8420]],
            'Biliran' => ['Naval' => [11.5617, 124.3989]],
            'Samar' => ['Catbalogan City' => [11.7753, 124.8861]],
            'Eastern Samar' => ['Borongan City' => [11.6078, 125.4328]],
            'Northern Samar' => [],
        ];
        foreach ($places as $province => $cities) {
            $p = Province::firstOrCreate(['name' => $province]);
            foreach ($cities as $city => [$lat, $lng]) {
                City::updateOrCreate(['province_id' => $p->id, 'name' => $city], ['latitude' => $lat, 'longitude' => $lng]);
            }
        }

        foreach (['LPT', 'CSE', 'TESDA', 'Other Exams', 'General'] as $name) {
            AnnouncementCategory::firstOrCreate(['name' => $name]);
        }

        $vehicles = [
            'Toyota' => ['Vios', 'Innova', 'Hiace'],
            'Mitsubishi' => ['Xpander', 'L300'],
            'Nissan' => ['Urvan'],
            'Suzuki' => ['Ertiga'],
        ];
        foreach ($vehicles as $make => $models) {
            $m = VehicleMake::firstOrCreate(['name' => $make]);
            foreach ($models as $model) {
                VehicleModel::firstOrCreate(['make_id' => $m->id, 'name' => $model]);
            }
        }

        // Nova chatbot. One intent -> many keywords. Keywords are UNIQUE across the table and matched as whole words;
        // the intent with the most matching keywords wins. English + Tagalog.
        // Nova's brain: one intent -> many UNIQUE keywords (English + Tagalog/Waray). The intent matching the
        // most words of a message wins (see ChatbotIntent::replyFor).
        $intents = [
            'greeting' => ['Hi! I\'m Nova, the RideNovaPH assistant. Ask me about booking, ID verification, payment, cancellation or safety.', ['hello', 'hi', 'hey', 'kumusta', 'musta']],
            'how_to_book' => ['Open Bookings → Find a ride, pick a ride, then Review & Reserve. Fill in your contact details and pick-up spot, and you will get a reference number like RNP-20261011-ABC123. The driver then approves and you confirm.', ['book', 'reserve', 'reservation', 'mag-book']],
            'id_required' => ['Passengers and drivers must upload a valid ID before booking or publishing. Go to your Profile → Verify ID. Drivers also upload a driver\'s licence under Driver → Apply.', ['id', 'verify', 'verification', 'upload', 'valid']],
            'id_status' => ['Check your Profile for your ID status. If it was rejected, the reason is shown there and you can upload a new photo.', ['rejected', 'pending', 'approved', 'resubmit']],
            'cancellation' => ['Open the booking and press Cancel booking. Passengers cannot cancel within the cut-off window before departure (see your booking page). Please cancel early so the driver can free up your seat.', ['cancel', 'cancellation', 'kansela']],
            'payment' => ['Payment is cash on ride for now. You pay the driver on the day of the trip, and your receipt appears under Transactions once the trip is completed.', ['pay', 'payment', 'cash', 'bayad', 'receipt']],
            'fare' => ['The fare is per seat and set by the driver. You can see the total (seats × price) on the Review & Reserve step before you confirm.', ['fare', 'price', 'cost', 'magkano', 'rate']],
            'refund' => ['Refunds are handled by an admin. Contact support with your booking reference and the reason.', ['refund', 'refunds', 'ibalik']],
            'exam_rides' => ['Rides for LPT, CSE and TESDA exams are listed under Announcements on your dashboard. Tap an announcement to see rides to that exam city.', ['exam', 'lpt', 'cse', 'tesda']],
            'drivers' => ['To drive, register as a driver, upload your licence, register your vehicle, then publish rides under Driver → My rides.', ['driver', 'drivers', 'publish', 'vehicle', 'drayber']],
            'reference_number' => ['Every booking gets a reference number like RNP-YYYYMMDD-XXXXXX. Find it on the booking page and share it with your driver.', ['reference', 'ref', 'number', 'code']],
            'safety' => ['Every user is ID-verified and drivers are licence-checked. Share your trip with someone you trust, and rate your driver after the trip.', ['safe', 'safety', 'secure', 'ligtas']],
            'seats_luggage' => ['You can book up to the maximum seats shown on the form. Ask the driver about luggage in the booking notes or by calling the number on your booking.', ['seat', 'seats', 'luggage', 'baggage', 'bag']],
            'routes' => ['We currently cover Eastern Visayas: Tacloban, Ormoc, Baybay, Abuyog, Maasin, Naval, Catbalogan and Borongan, with more coming.', ['route', 'routes', 'where', 'cities', 'saan']],
            'map_gps' => ['On the booking form, tap the map to drop a pin or press "Use my location" to detect where you are. Your browser will ask permission first.', ['map', 'gps', 'location', 'track']],
            'support' => ['You can reach support from the email shown at the bottom of the page. Include your booking reference so we can help faster.', ['support', 'help', 'contact', 'tulong', 'problem']],
            'thanks' => ['You\'re welcome! Safe travels.', ['thanks', 'thank', 'salamat', 'daghang']],
        ];
        foreach ($intents as $name => [$answer, $keywords]) {
            $intent = ChatbotIntent::updateOrCreate(['name' => $name], ['answer' => $answer]);
            foreach ($keywords as $keyword) {
                $intent->keywords()->firstOrCreate(['keyword' => $keyword]);
            }
        }
    }
}
