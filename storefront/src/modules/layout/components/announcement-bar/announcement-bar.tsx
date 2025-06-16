import { createContext, useContext, useState, ReactNode, useEffect } from "react";


type AnnouncementBarContextType = {
  isVisible: boolean;
  hideBar: () => void;
  showBar: () => void;
};

const AnnouncementBarContext = createContext<AnnouncementBarContextType | undefined>(undefined);

export const AnnouncementBarProvider = ({ children }: { children: ReactNode }) => {
  const [isVisible, setIsVisible] = useState(true);

  const hideBar = () => setIsVisible(false);
  const showBar = () => setIsVisible(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(false), 5000); // Beispiel: Bar nach 5 Sekunden ausblenden
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnnouncementBarContext.Provider value={{ isVisible, hideBar, showBar }}>
      {children}
    </AnnouncementBarContext.Provider>
  );
};

export const useAnnouncementBar = () => {
  const context = useContext(AnnouncementBarContext);
  if (!context) {
    throw new Error("useAnnouncementBar must be used within an AnnouncementBarProvider");
  }
  return context;
};

export default function AnnouncementBar() {
  const { isVisible } = useAnnouncementBar();

  if (!isVisible) return null;

  return (
    <div className="w-full bg-black text-white text-center py-2 text-sm font-medium">
      Announcement Bar Content
    </div>
  );
}