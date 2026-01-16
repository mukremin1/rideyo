import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Chatbot from "@/components/Chatbot";
import BottomNav from "@/components/BottomNav";
import OfflineIndicator from "@/components/OfflineIndicator";
import Index from "./pages/Index";
import Cars from "./pages/Cars";
import CarDetail from "./pages/CarDetail";
import Auth from "./pages/Auth";
import AddCar from "./pages/AddCar";
import MyCars from "./pages/MyCars";
import Subscription from "./pages/Subscription";
import Admin from "./pages/Admin";
import Favorites from "./pages/Favorites";
import Notifications from "./pages/Notifications";
import Support from "./pages/Support";
import VehicleAlerts from "./pages/VehicleAlerts";
import DriverScore from "./pages/DriverScore";
import GPSTracking from "./pages/GPSTracking";
import About from "./pages/About";
import Contact from "./pages/Contact";
import FAQ from "./pages/FAQ";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import KVKK from "./pages/KVKK";
import CookiePolicy from "./pages/CookiePolicy";
import SafetyGuidelines from "./pages/SafetyGuidelines";
import RentalAgreement from "./pages/RentalAgreement";
import OwnerGuide from "./pages/OwnerGuide";
import EarningsCalculator from "./pages/EarningsCalculator";
import CarComparison from "./pages/CarComparison";
import OwnerDashboard from "./pages/OwnerDashboard";
import AvailabilityCalendar from "./pages/AvailabilityCalendar";
import Install from "./pages/Install";
import Payment from "./pages/Payment";
import CancellationPolicy from "./pages/CancellationPolicy";
import MyBookings from "./pages/MyBookings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <OfflineIndicator />
      <Chatbot />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/cars" element={<Cars />} />
            <Route path="/car/:id" element={<CarDetail />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/add-car" element={<AddCar />} />
            <Route path="/my-cars" element={<MyCars />} />
            <Route path="/subscription" element={<Subscription />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/support" element={<Support />} />
            <Route path="/vehicle-alerts" element={<VehicleAlerts />} />
            <Route path="/driver-score" element={<DriverScore />} />
            <Route path="/gps-tracking" element={<GPSTracking />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/kvkk" element={<KVKK />} />
            <Route path="/cookie-policy" element={<CookiePolicy />} />
            <Route path="/safety-guidelines" element={<SafetyGuidelines />} />
            <Route path="/rental-agreement" element={<RentalAgreement />} />
            <Route path="/owner-guide" element={<OwnerGuide />} />
            <Route path="/earnings-calculator" element={<EarningsCalculator />} />
            <Route path="/car-comparison" element={<CarComparison />} />
            <Route path="/owner-dashboard" element={<OwnerDashboard />} />
            <Route path="/availability-calendar" element={<AvailabilityCalendar />} />
            <Route path="/install" element={<Install />} />
            <Route path="/payment" element={<Payment />} />
            <Route path="/cancellation-policy" element={<CancellationPolicy />} />
            <Route path="/my-bookings" element={<MyBookings />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <BottomNav />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
