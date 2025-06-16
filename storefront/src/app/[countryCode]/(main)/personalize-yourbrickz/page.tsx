"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation"; // Für die Navigation zu einer neuen Seite

// oberhalb von `export default …`
type YourbrickzColor = { id: string; yourbrickz_id: string; name: string; hex: string; rgb: number[] };

// Custom color order - change these numbers to reorder the colors (1-51)
const COLOR_DISPLAY_ORDER = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
  31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
  41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51
];

export default function PersonalizeYourbrickzPage() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [randomImages, setRandomImages] = useState<string[]>([]);
  const [allImages, setAllImages] = useState<string[]>([]);
  const [isBrickzMeClicked, setIsBrickzMeClicked] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mosaicData, setMosaicData] = useState<string[][]>([]);
  const [selectedColor, setSelectedColor] = useState<string>("#ffffff");
  const [isDrawing, setIsDrawing] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState(1);
  const [mosaicDimensions, setMosaicDimensions] = useState({ width: 32, height: 32 });
  const [yourbrickzColors, setYourbrickzColors] = useState<YourbrickzColor[]>([]);
  const [yourbrickzPrices, setYourbrickzPrices] = useState<any>(null);
  const [mosaicSize, setMosaicSize] = useState(48);
  const [showBorder, setShowBorder] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [sizeSettingsExpanded, setSizeSettingsExpanded] = useState(true);
  const [drawPaintExpanded, setDrawPaintExpanded] = useState(true);
  const [adjustmentsExpanded, setAdjustmentsExpanded] = useState(false);
  const [isPaintMode, setIsPaintMode] = useState(false); // false = Move, true = Paint (changed default to Move)
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [sharpness, setSharpness] = useState(0);
  const [selectedBottomBox, setSelectedBottomBox] = useState(0); // Add state for selected box (0-4)
  const [currentAdjustmentType, setCurrentAdjustmentType] = useState<'brightness' | 'contrast' | 'saturation' | 'sharpness'>('brightness');
  const [showAdjustmentMenu, setShowAdjustmentMenu] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter(); // Router-Instanz für Navigation

  // Helper function to sort colors by custom order
  const getSortedColors = () => {
    if (mosaicData.length === 0) {
      // If no mosaic data, use default order
      const colorMap = new Map(yourbrickzColors.map(color => [parseInt(color.id), color]));
      return COLOR_DISPLAY_ORDER
        .map(id => colorMap.get(id))
        .filter(color => color !== undefined) as YourbrickzColor[];
    }

    // Count color usage in mosaic
    const colorUsage = new Map<string, number>();
    mosaicData.forEach(row => {
      row.forEach(color => {
        if (color !== "F") { // Ignore frame markers
          colorUsage.set(color, (colorUsage.get(color) || 0) + 1);
        }
      });
    });

    // Separate used and unused colors
    const usedColors: YourbrickzColor[] = [];
    const unusedColors: YourbrickzColor[] = [];

    yourbrickzColors.forEach(color => {
      if (colorUsage.has(color.hex)) {
        usedColors.push(color);
      } else {
        unusedColors.push(color);
      }
    });

    // Sort used colors by frequency (most used first)
    usedColors.sort((a, b) => (colorUsage.get(b.hex) || 0) - (colorUsage.get(a.hex) || 0));

    // Sort unused colors by custom order
    const colorMap = new Map(yourbrickzColors.map(color => [parseInt(color.id), color]));
    const sortedUnusedColors = COLOR_DISPLAY_ORDER
      .map(id => colorMap.get(id))
      .filter(color => color !== undefined && !colorUsage.has(color.hex)) as YourbrickzColor[];

    // Return used colors first, then unused colors
    return [...usedColors, ...sortedUnusedColors];
  };

  // Helper function to check if a color is used in the mosaic
  const isColorUsed = (colorHex: string) => {
    if (mosaicData.length === 0) return false;
    
    return mosaicData.some(row => 
      row.some(color => color === colorHex && color !== "F")
    );
  };

  // Helper function to get color usage count
  const getColorUsageCount = (colorHex: string) => {
    if (mosaicData.length === 0) return 0;
    
    let count = 0;
    mosaicData.forEach(row => {
      row.forEach(color => {
        if (color === colorHex && color !== "F") {
          count++;
        }
      });
    });
    return count;
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 900); // Smartphone-Bildschirmbreite
    };

    handleResize(); // Initial prüfen
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize); // Cleanup
  }, []);

  useEffect(() => {
    // Alle Bilder aus dem Ordner "diashow" laden
    const fetchImages = async () => {
      const response = await fetch("/api/diashow");
      const images = await response.json();
      setAllImages(images);

      // Initiale zufällige Auswahl von 4 Bildern
      const initialSelection = images
        .sort(() => Math.random() - 0.5)
        .slice(0, 4);
      setRandomImages(initialSelection);
    };

    fetchImages();
  }, []);

  useEffect(() => {
    // Timer für das Wechseln der Bilder alle 7 Sekunden
    const interval = setInterval(() => {
      const newSelection = allImages
        .sort(() => Math.random() - 0.5)
        .slice(0, 4);
      setRandomImages(newSelection);
    }, 7000);

    return () => clearInterval(interval); // Timer bereinigen
  }, [allImages]);

  // Fetch colors from JSON file
  useEffect(() => {
    const fetchColors = async () => {
      try {
        const response = await fetch("/yourbrickz_colors.json")
        if (!response.ok) {
          throw new Error(`Failed to fetch colors: ${response.status}`)
        }
        const colorsData = await response.json()

        // Convert the imported colors to the format we need
        const formattedColors = Object.entries(colorsData).map(([id, data]: [string, any]) => ({
          id: id,
          yourbrickz_id: data.yourbrickz_id,
          name: data.ridgway_name,
          hex: data.color,
          rgb: data.rgb,
        }))

        setYourbrickzColors(formattedColors)

        // Set initial selected color
        if (formattedColors.length > 0) {
          setSelectedColor(formattedColors[0].hex)
        }
      } catch (error) {
        console.error("Error loading colors:", error)
      }
    }

    fetchColors()
  }, [])

  // Fetch prices from JSON file
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const response = await fetch("/yourbrickz_prices.json")
        if (!response.ok) {
          throw new Error(`Failed to fetch prices: ${response.status}`)
        }
        const pricesData = await response.json()
        setYourbrickzPrices(pricesData)
      } catch (error) {
        console.error("Error loading prices:", error)
      }
    }

    fetchPrices()
  }, [])

  // Calculate real price based on mosaic dimensions
  const calculatePrice = () => {
    if (!yourbrickzPrices) return 0

    const totalBricks = mosaicDimensions.width * mosaicDimensions.height
    // Each baseplate is 16x16 = 256 bricks
    const totalBaseplates = Math.ceil(totalBricks / 256)

    // Determine size category based on total baseplates
    let sizeCategory = "fallback"
    if (totalBaseplates <= 5) sizeCategory = "XS"
    else if (totalBaseplates <= 20) sizeCategory = "S"
    else if (totalBaseplates <= 45) sizeCategory = "M"
    else if (totalBaseplates <= 80) sizeCategory = "L"
    else if (totalBaseplates <= 216) sizeCategory = "XL"

    // Find the price for the exact baseplate count or closest higher count
    const priceArray = yourbrickzPrices[sizeCategory] || yourbrickzPrices.fallback
    const priceEntry = priceArray.find((entry: any) => entry.count >= totalBaseplates) || priceArray[priceArray.length - 1]
    
    return priceEntry ? priceEntry.price : 0
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const reader = new FileReader();

      reader.onload = (e) => {
        if (e.target?.result) {
          setSelectedImage(e.target.result as string);
        }
      };

      reader.readAsDataURL(file);
    }
  };

  // Apply image adjustments to canvas context
  const applyImageAdjustments = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i]
      let g = data[i + 1]
      let b = data[i + 2]

      // Apply brightness (-50 to +50)
      if (brightness !== 0) {
        const brightnessFactor = brightness * 2.55 // Convert to 0-255 range
        r = Math.max(0, Math.min(255, r + brightnessFactor))
        g = Math.max(0, Math.min(255, g + brightnessFactor))
        b = Math.max(0, Math.min(255, b + brightnessFactor))
      }

      // Apply contrast (-50 to +50)
      if (contrast !== 0) {
        const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast))
        r = Math.max(0, Math.min(255, contrastFactor * (r - 128) + 128))
        g = Math.max(0, Math.min(255, contrastFactor * (g - 128) + 128))
        b = Math.max(0, Math.min(255, contrastFactor * (b - 128) + 128))
      }

      // Apply saturation (-50 to +50)
      if (saturation !== 0) {
        const saturationFactor = (saturation + 50) / 50 // Convert to 0-2 range
        const gray = 0.299 * r + 0.587 * g + 0.114 * b
        r = Math.max(0, Math.min(255, gray + saturationFactor * (r - gray)))
        g = Math.max(0, Math.min(255, gray + saturationFactor * (g - gray)))
        b = Math.max(0, Math.min(255, gray + saturationFactor * (b - gray)))
      }

      // Apply sharpness (simplified version)
      if (sharpness !== 0) {
        // For simplicity, we'll apply a basic sharpening effect
        // In a full implementation, you'd use convolution matrices
        const sharpnessFactor = sharpness / 50
        r = Math.max(0, Math.min(255, r + (r - 128) * sharpnessFactor))
        g = Math.max(0, Math.min(255, g + (g - 128) * sharpnessFactor))
        b = Math.max(0, Math.min(255, b + (b - 128) * sharpnessFactor))
      }

      data[i] = r
      data[i + 1] = g
      data[i + 2] = b
    }

    ctx.putImageData(imageData, 0, 0)
  }

  // Convert image to LEGO mosaic with preserved aspect ratio
  const convertToMosaic = (imageSrc: string, size?: number, borderEnabled?: boolean) => {
    if (yourbrickzColors.length === 0) {
      console.error("Colors not loaded yet")
      return
    }

    const currentSize = size || mosaicSize
    const currentBorder = borderEnabled !== undefined ? borderEnabled : showBorder
    console.log("Converting with size:", currentSize, "border:", currentBorder) // Debug log

    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    const img = new Image()

    img.crossOrigin = "anonymous"
    img.onload = () => {
      // Calculate aspect ratio
      const aspectRatio = img.width / img.height
      setImageAspectRatio(aspectRatio)

      console.log("Converting with mosaicSize:", currentSize, "aspectRatio:", aspectRatio) // Debug log

      // Determine grid size based on aspect ratio and selected size
      // Both dimensions must be multiples of 16
      let gridWidth, gridHeight

      if (aspectRatio > 1) {
        // Landscape - height is smaller dimension, should be exactly mosaicSize
        gridHeight = currentSize
        // Calculate width and round to nearest 16
        const calculatedWidth = currentSize * aspectRatio
        gridWidth = Math.round(calculatedWidth / 16) * 16
      } else {
        // Portrait or square - width is smaller dimension, should be exactly mosaicSize
        gridWidth = currentSize
        // Calculate height and round to nearest 16
        const calculatedHeight = currentSize / aspectRatio
        gridHeight = Math.round(calculatedHeight / 16) * 16
      }

      console.log("Grid dimensions:", gridWidth, "x", gridHeight) // Debug log
      setMosaicDimensions({ width: gridWidth, height: gridHeight })

      // Recalculate actual aspect ratio based on rounded dimensions
      const actualAspectRatio = gridWidth / gridHeight
      setImageAspectRatio(actualAspectRatio)

      canvas.width = gridWidth
      canvas.height = gridHeight

      // Draw and scale image to grid size
      ctx?.drawImage(img, 0, 0, gridWidth, gridHeight)

      // Apply image adjustments before color conversion
      if (ctx && (brightness !== 0 || contrast !== 0 || saturation !== 0 || sharpness !== 0)) {
        applyImageAdjustments(canvas, ctx)
      }

      const imageData = ctx?.getImageData(0, 0, gridWidth, gridHeight)
      const pixels = imageData?.data

      const mosaic: string[][] = []

      for (let y = 0; y < gridHeight; y++) {
        const row: string[] = []
        for (let x = 0; x < gridWidth; x++) {
          const index = (y * gridWidth + x) * 4
          const r = pixels?.[index] || 0
          const g = pixels?.[index + 1] || 0
          const b = pixels?.[index + 2] || 0

          // Add frame marker if border is enabled and at edge
          if (currentBorder && (x === 0 || y === 0 || x === gridWidth - 1 || y === gridHeight - 1)) {
            row.push("F") // F for Frame
          } else {
            // Find closest LEGO color (still restricted to JSON palette)
            const closestColor = findClosestLegoColor(r, g, b)
            row.push(closestColor)
          }
        }
        mosaic.push(row)
      }

      setMosaicData(mosaic)

      // Set initial zoom to fit the entire image after a short delay to ensure container is rendered
      setTimeout(() => {
        const rect = gridContainerRef.current?.getBoundingClientRect()
        if (rect) {
          const containerWidth = rect.width - 48
          const containerHeight = rect.height - 48
          const imageWidth = isMobile 
            ? Math.min(containerWidth, 800)
            : Math.min(containerWidth, 1400)
          const imageHeight = imageWidth / actualAspectRatio
          
          const minZoomX = containerWidth / imageWidth
          const minZoomY = containerHeight / imageHeight
          const initialZoom = Math.min(minZoomX, minZoomY, 1.0)
          
          setZoom(initialZoom)
          setPan({ x: 0, y: 0 })
        }
      }, 100)
    }

    img.src = imageSrc
  }

  // Find closest LEGO color to RGB values using the JSON colors
  const findClosestLegoColor = (r: number, g: number, b: number): string => {
    if (yourbrickzColors.length === 0) {
      return "#000000" // Default to black if colors aren't loaded
    }

    let minDistance = Number.POSITIVE_INFINITY
    let closestColor = yourbrickzColors[0].hex

    yourbrickzColors.forEach((color) => {
      const [colorR, colorG, colorB] = color.rgb
      const distance = Math.sqrt(Math.pow(r - colorR, 2) + Math.pow(g - colorG, 2) + Math.pow(b - colorB, 2))

      if (distance < minDistance) {
        minDistance = distance
        closestColor = color.hex
      }
    })

    return closestColor
  }

  const handleBrickClick = (row: number, col: number) => {
    if (mosaicData.length > 0 && mosaicData[row][col] !== "F") {
      const newMosaic = [...mosaicData]
      newMosaic[row][col] = selectedColor
      setMosaicData(newMosaic)
    }
  }

  const handleMouseDown = () => setIsDrawing(true)
  const handleMouseUp = () => setIsDrawing(false)

  const handleBrickHover = (row: number, col: number) => {
    if (isDrawing && mosaicData.length > 0 && !isPanning && mosaicData[row][col] !== "F") {
      const newMosaic = [...mosaicData]
      newMosaic[row][col] = selectedColor
      setMosaicData(newMosaic)
    }
  }

  // Pan and Zoom handlers
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    
    const rect = gridContainerRef.current?.getBoundingClientRect()
    if (!rect || !mosaicData.length || imageAspectRatio === 0) return
    
    // Calculate minimum zoom to fit entire image
    const containerWidth = rect.width - 48 // Account for padding
    const containerHeight = rect.height - 48
    
    if (containerWidth <= 0 || containerHeight <= 0) return // Prevent division by zero
    
    const imageWidth = isMobile 
      ? Math.min(containerWidth, 800)
      : Math.min(containerWidth, 1400)
    const imageHeight = imageWidth / Math.max(imageAspectRatio, 0.1) // Prevent division by zero
    
    const minZoomX = containerWidth / Math.max(imageWidth, 1)
    const minZoomY = containerHeight / Math.max(imageHeight, 1)
    const minZoom = Math.min(minZoomX, minZoomY, 1.0) // Don't go above 1.0 as minimum
    
    // Get mouse position relative to the container
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    
    // Convert mouse position to grid coordinates considering current zoom and pan
    const currentZoom = Math.max(zoom, 0.1) // Prevent division by zero
    const gridX = (mouseX - rect.width / 2 - pan.x) / currentZoom
    const gridY = (mouseY - rect.height / 2 - pan.y) / currentZoom
    
    const delta = Math.max(-0.5, Math.min(0.5, e.deltaY * -0.01)) // Clamp delta
    // Limit zoom out to minZoom and zoom in to 4.0
    const newZoom = Math.min(Math.max(minZoom, currentZoom + delta), 4)
    
    // If we're at minimum zoom, center the image
    if (newZoom <= minZoom * 1.01) { // Small tolerance
      setPan({ x: 0, y: 0 })
      setZoom(newZoom)
    } else {
      // Calculate new pan to keep the point under the mouse stationary
      const newPanX = mouseX - rect.width / 2 - gridX * newZoom
      const newPanY = mouseY - rect.height / 2 - gridY * newZoom
      
      // Clamp pan values to reasonable bounds
      const maxPan = Math.max(imageWidth, imageHeight) * newZoom
      const clampedPanX = Math.max(-maxPan, Math.min(maxPan, newPanX))
      const clampedPanY = Math.max(-maxPan, Math.min(maxPan, newPanY))
      
      setPan({ x: clampedPanX, y: clampedPanY })
      setZoom(newZoom)
    }
  }

  const handlePanStart = (e: React.MouseEvent) => {
    if ((e.button === 0 && e.ctrlKey) || !isPaintMode) { // Left click + Ctrl OR Move mode
      e.preventDefault()
      setIsPanning(true)
      setLastPanPoint({ x: e.clientX, y: e.clientY })
    }
  }

  const handlePanMove = (e: React.MouseEvent) => {
    if (isPanning) {
      e.preventDefault()
      const deltaX = e.clientX - lastPanPoint.x
      const deltaY = e.clientY - lastPanPoint.y
      
      // Clamp movement deltas
      const clampedDeltaX = Math.max(-100, Math.min(100, deltaX))
      const clampedDeltaY = Math.max(-100, Math.min(100, deltaY))
      
      setPan(prev => ({
        x: prev.x + clampedDeltaX,
        y: prev.y + clampedDeltaY
      }))
      setLastPanPoint({ x: e.clientX, y: e.clientY })
    }
  }

  const handlePanEnd = () => {
    setIsPanning(false)
  }

  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault()
      setIsPanning(true)
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      if (touch1 && touch2) {
        const centerX = (touch1.clientX + touch2.clientX) / 2
        const centerY = (touch1.clientY + touch2.clientY) / 2
        setLastPanPoint({ x: centerX, y: centerY })
      }
    } else if (e.touches.length === 1) {
      const touch = e.touches[0]
      if (touch) {
        setLastPanPoint({ x: touch.clientX, y: touch.clientY })
      }
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault()
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      
      if (touch1 && touch2) {
        // Calculate zoom based on distance between fingers
        const distance = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) + 
          Math.pow(touch2.clientY - touch1.clientY, 2)
        )
        
        // Pan based on center point movement
        const centerX = (touch1.clientX + touch2.clientX) / 2
        const centerY = (touch1.clientY + touch2.clientY) / 2
        
        if (isPanning) {
          const deltaX = centerX - lastPanPoint.x
          const deltaY = centerY - lastPanPoint.y
          
          // Clamp movement deltas
          const clampedDeltaX = Math.max(-100, Math.min(100, deltaX))
          const clampedDeltaY = Math.max(-100, Math.min(100, deltaY))
          
          setPan(prev => ({
            x: prev.x + clampedDeltaX,
            y: prev.y + clampedDeltaY
          }))
        }
        
        setLastPanPoint({ x: centerX, y: centerY })
      }
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      setIsPanning(false)
    }
  }

  const resetZoomAndPan = () => {
    // Calculate minimum zoom to fit entire image
    const rect = gridContainerRef.current?.getBoundingClientRect()
    if (rect && imageAspectRatio > 0) {
      const containerWidth = rect.width - 48
      const containerHeight = rect.height - 48
      
      if (containerWidth > 0 && containerHeight > 0) {
        const imageWidth = isMobile 
          ? Math.min(containerWidth, 800)
          : Math.min(containerWidth, 1400)
        const imageHeight = imageWidth / imageAspectRatio
        
        const minZoomX = containerWidth / Math.max(imageWidth, 1)
        const minZoomY = containerHeight / Math.max(imageHeight, 1)
        const minZoom = Math.min(minZoomX, minZoomY, 1.0)
        
        setZoom(minZoom)
      } else {
        setZoom(1)
      }
    } else {
      setZoom(1)
    }
    setPan({ x: 0, y: 0 })
  }

  const handleSizeChange = (newSize: number) => {
    console.log("Size changed to:", newSize) // Debug log
    setMosaicSize(newSize)
    if (selectedImage) {
      // Pass the new size directly to avoid closure issues
      convertToMosaic(selectedImage, newSize)
    }
  }

  const handleBorderToggle = () => {
    setShowBorder(!showBorder)
    if (selectedImage) {
      convertToMosaic(selectedImage, undefined, !showBorder)
    }
  }

  const handleAdjustmentChange = (type: 'brightness' | 'contrast' | 'saturation' | 'sharpness', value: number) => {
    switch (type) {
      case 'brightness':
        setBrightness(value)
        break
      case 'contrast':
        setContrast(value)
        break
      case 'saturation':
        setSaturation(value)
        break
      case 'sharpness':
        setSharpness(value)
        break
    }
    
    // Regenerate mosaic with new adjustments
    if (selectedImage) {
      // Use setTimeout to ensure state is updated before conversion
      setTimeout(() => {
        convertToMosaic(selectedImage)
      }, 10)
    }
  }

  const handleBrickzMe = () => {
    if (selectedImage) {
      setIsBrickzMeClicked(true); // Hide elements
      convertToMosaic(selectedImage);

      // Scrollen deaktivieren
      document.body.style.overflow = "hidden";

      // Automatisch nach oben scrollen
      window.scrollTo({ top: 0, behavior: "smooth" });

      console.log("Personalize action triggered with image:", selectedImage);
    }
  };

  const handleLogoClick = () => {
    if (window.confirm("Möchten Sie die Seite wirklich verlassen?")) {
      router.push("/"); // Zur Startseite navigieren
    }
  };

  const handleBottomBoxClick = (index: number) => {
    if (index === 2) {
      if (selectedBottomBox === 2) {
        // If contrast panel is already open, toggle the menu
        setShowAdjustmentMenu(!showAdjustmentMenu);
      } else {
        // First time opening contrast panel, show menu
        setSelectedBottomBox(index);
        setShowAdjustmentMenu(true);
      }
    } else {
      setSelectedBottomBox(index);
      setShowAdjustmentMenu(false);
    }

    // Mobile mode switching logic
    if (isMobile) {
      if (index === 3) {
        // Paint icon clicked - switch to paint mode
        setIsPaintMode(true);
      } else {
        // Any other icon clicked - switch to move mode
        setIsPaintMode(false);
      }
    }
  };

  const handleAdjustmentSelection = (type: 'brightness' | 'contrast' | 'saturation' | 'sharpness') => {
    setCurrentAdjustmentType(type);
    setShowAdjustmentMenu(false);
  };

  const getCurrentAdjustmentValue = () => {
    switch (currentAdjustmentType) {
      case 'brightness': return brightness;
      case 'contrast': return contrast;
      case 'saturation': return saturation;
      case 'sharpness': return sharpness;
      default: return 0;
    }
  };

  const getAdjustmentLabel = () => {
    switch (currentAdjustmentType) {
      case 'brightness': return 'Helligkeit';
      case 'contrast': return 'Kontrast';
      case 'saturation': return 'Sättigung';
      case 'sharpness': return 'Schärfe';
      default: return 'Helligkeit';
    }
  };

  const getSizeLabel = (size: number) => {
    if (size <= 16) return 'XS';
    if (size <= 32) return 'S';
    if (size <= 48) return 'M';
    if (size <= 64) return 'L';
    if (size <= 80) return 'XL';
    return 'XXL';
  };

  if (isBrickzMeClicked) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col lg:flex-row pb-[100px]">
        {/* Desktop Sidebar/Menü links */}
        <div className="hidden lg:block w-96 bg-white shadow-lg p-6 overflow-y-auto">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-gradient-to-br from-red-500 via-yellow-500 to-blue-500 rounded"></div>
            <h1 className="text-xl font-bold">Creator</h1>
          </div>

          {/* Size & Settings */}
          <div className="mb-4">
            <button
              onClick={() => setSizeSettingsExpanded(!sizeSettingsExpanded)}
              className="flex items-center justify-between w-full p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 border-2 border-gray-400 rounded"></div>
                <div className="text-left">
                  <h3 className="font-semibold">Größe & Einstellungen</h3>
                  <p className="text-sm text-gray-500">Mosaik-Abmessungen</p>
                </div>
              </div>
              <div className={`transform transition-transform ${sizeSettingsExpanded ? 'rotate-180' : ''}`}>
                ▼
              </div>
            </button>

            {sizeSettingsExpanded && (
              <div className="mt-3 space-y-4 px-3">
                <div>
                  <label className="block text-sm font-medium mb-2">Größe (kleinere Seite): {mosaicSize}</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSizeChange(Math.max(16, mosaicSize - 16))}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 w-8 h-8 rounded flex items-center justify-center text-lg font-bold transition-colors"
                      disabled={mosaicSize <= 16}
                    >
                      −
                    </button>
                    <input
                      type="range"
                      min="16"
                      max="128"
                      step="16"
                      value={mosaicSize}
                      onChange={(e) => handleSizeChange(Number(e.target.value))}
                      className="flex-1"
                    />
                    <button
                      onClick={() => handleSizeChange(Math.min(128, mosaicSize + 16))}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 w-8 h-8 rounded flex items-center justify-center text-lg font-bold transition-colors"
                      disabled={mosaicSize >= 128}
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Border Toggle Switch */}
                <div>
                  <label className="block text-sm font-medium mb-2">Rahmen</label>
                  <div className="flex items-center justify-center bg-gray-200 rounded-lg p-1">
                    <button
                      onClick={() => {
                        setShowBorder(false)
                        if (selectedImage) {
                          convertToMosaic(selectedImage, undefined, false)
                        }
                      }}
                      className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                        !showBorder 
                          ? 'bg-white text-gray-900 shadow-sm' 
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Aus
                    </button>
                    <button
                      onClick={() => {
                        setShowBorder(true)
                        if (selectedImage) {
                          convertToMosaic(selectedImage, undefined, true)
                        }
                      }}
                      className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                        showBorder 
                          ? 'bg-green-500 text-white shadow-sm' 
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      An
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Draw & Paint Section */}
          <div className="mb-4">
            <button
              onClick={() => setDrawPaintExpanded(!drawPaintExpanded)}
              className="flex items-center justify-between w-full p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center">
                  <div className="w-2 h-4 bg-yellow-500 rounded-sm"></div>
                </div>
                <div className="text-left">
                  <h3 className="font-semibold">Zeichnen & Malen</h3>
                  <p className="text-sm text-gray-500">Einzelne Steine ändern</p>
                </div>
              </div>
              <div className={`transform transition-transform ${drawPaintExpanded ? 'rotate-180' : ''}`}>
                ▼
              </div>
            </button>

            {drawPaintExpanded && (
              <div className="mt-3 px-3">
                {/* Mode Toggle Switch */}
                <div className="mb-4">
                  <div className="flex items-center justify-center bg-gray-200 rounded-lg p-1">
                    <button
                      onClick={() => setIsPaintMode(false)}
                      className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                        !isPaintMode 
                          ? 'bg-white text-gray-900 shadow-sm' 
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Bewegen
                    </button>
                    <button
                      onClick={() => setIsPaintMode(true)}
                      className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                        isPaintMode 
                          ? 'bg-green-500 text-white shadow-sm' 
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Malen
                    </button>
                  </div>
                </div>

                <p className="text-sm font-medium mb-2">Wählen Sie eine Farbe</p>
                <div className="grid grid-cols-8 gap-1 max-h-96 overflow-y-auto">
                  {getSortedColors().map((color, index) => {
                    const isUsed = isColorUsed(color.hex);
                    const usageCount = getColorUsageCount(color.hex);
                    return (
                      <button
                        key={index}
                        className={`w-8 h-8 rounded-full border-2 ${
                          selectedColor === color.hex 
                            ? "border-gray-800" 
                            : isUsed
                              ? "border-blue-500"
                              : "border-gray-300"
                        } ${isUsed ? 'ring-2 ring-blue-200' : ''} transition-all`}
                        style={{ backgroundColor: color.hex }}
                        onClick={() => setSelectedColor(color.hex)}
                        title={`${color.name} (${color.yourbrickz_id})${isUsed ? ` - ${usageCount} Brickz` : ''}`}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Adjustments Section */}
          <div className="mb-4">
            <button
              onClick={() => setAdjustmentsExpanded(!adjustmentsExpanded)}
              className="flex items-center justify-between w-full p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-200 rounded flex items-center justify-center">
                  <div className="w-3 h-3 bg-blue-600 rounded-sm"></div>
                </div>
                <div className="text-left">
                  <h3 className="font-semibold">Anpassungen</h3>
                  <p className="text-sm text-gray-500">Mosaik feinabstimmen</p>
                </div>
              </div>
              <div className={`transform transition-transform ${adjustmentsExpanded ? 'rotate-180' : ''}`}>
                ▼
              </div>
            </button>

            {adjustmentsExpanded && (
              <div className="mt-3 space-y-4 px-3">
                <div>
                  <label className="block text-sm font-medium mb-2">Helligkeit: {brightness}</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAdjustmentChange('brightness', Math.max(-50, brightness - 5))}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 w-8 h-8 rounded flex items-center justify-center text-lg font-bold"
                      disabled={brightness <= -50}
                    >
                      −
                    </button>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      step="1"
                      value={brightness}
                      onChange={(e) => handleAdjustmentChange('brightness', Number(e.target.value))}
                      className="flex-1"
                    />
                    <button
                      onClick={() => handleAdjustmentChange('brightness', Math.min(50, brightness + 5))}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 w-8 h-8 rounded flex items-center justify-center text-lg font-bold"
                      disabled={brightness >= 50}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Kontrast: {contrast}</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAdjustmentChange('contrast', Math.max(-50, contrast - 5))}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 w-8 h-8 rounded flex items-center justify-center text-lg font-bold"
                      disabled={contrast <= -50}
                    >
                      −
                    </button>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      step="1"
                      value={contrast}
                      onChange={(e) => handleAdjustmentChange('contrast', Number(e.target.value))}
                      className="flex-1"
                    />
                    <button
                      onClick={() => handleAdjustmentChange('contrast', Math.min(50, contrast + 5))}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 w-8 h-8 rounded flex items-center justify-center text-lg font-bold"
                      disabled={contrast >= 50}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Sättigung: {saturation}</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAdjustmentChange('saturation', Math.max(-50, saturation - 5))}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 w-8 h-8 rounded flex items-center justify-center text-lg font-bold"
                      disabled={saturation <= -50}
                    >
                      −
                    </button>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      step="1"
                      value={saturation}
                      onChange={(e) => handleAdjustmentChange('saturation', Number(e.target.value))}
                      className="flex-1"
                    />
                    <button
                      onClick={() => handleAdjustmentChange('saturation', Math.min(50, saturation + 5))}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 w-8 h-8 rounded flex items-center justify-center text-lg font-bold"
                      disabled={saturation >= 50}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Schärfe: {sharpness}</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAdjustmentChange('sharpness', Math.max(-50, sharpness - 5))}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 w-8 h-8 rounded flex items-center justify-center text-lg font-bold"
                      disabled={sharpness <= -50}
                    >
                      −
                    </button>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      step="1"
                      value={sharpness}
                      onChange={(e) => handleAdjustmentChange('sharpness', Number(e.target.value))}
                      className="flex-1"
                    />
                    <button
                      onClick={() => handleAdjustmentChange('sharpness', Math.min(50, sharpness + 5))}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 w-8 h-8 rounded flex items-center justify-center text-lg font-bold"
                      disabled={sharpness >= 50}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Price Information Section */}
          <div className="mt-auto pt-4 border-t">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold mb-3">Mosaik-Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Größe:</span>
                  <span className="font-medium">
                    {mosaicDimensions.width} x {mosaicDimensions.height}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Gesamte Steine:</span>
                  <span className="font-medium">
                    {(mosaicDimensions.width * mosaicDimensions.height).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-gray-600">Preis:</span>
                  <span className="font-bold text-lg text-green-600">
                    €{calculatePrice().toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Canvas Area - Now uses full remaining width */}
        <div className="flex-1 p-4 lg:p-6 pb-20 lg:pb-6">
          <div className="flex justify-between items-center mb-4">
            <div></div>
            <div className="flex gap-2">
              {/* Removed mobile menu button */}
            </div>
          </div>

          {/* LEGO Mosaic Grid */}
          <div 
            ref={gridContainerRef}
            className="bg-white p-3 lg:p-6 rounded-lg flex justify-center items-center overflow-hidden relative"
            style={{
              width: "fit-content",
              height: "fit-content",
              maxWidth: isMobile ? "calc(100vw - 40px)" : "calc(100vw - 400px)", // Updated: only account for left sidebar
              maxHeight: "calc(100vh - 180px)",
              margin: "0 auto",
              cursor: isPanning ? 'grabbing' : (!isPaintMode ? 'grab' : (zoom > 1 ? 'grab' : 'default'))
            }}
            onWheel={handleWheel}
            onMouseDown={handlePanStart}
            onMouseMove={handlePanMove}
            onMouseUp={handlePanEnd}
            onMouseLeave={handlePanEnd}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Zoom controls */}
            <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
              <button
                onClick={() => setZoom(prev => Math.min(prev + 0.2, 4))}
                className="bg-white/80 hover:bg-white text-black w-8 h-8 rounded flex items-center justify-center text-lg font-bold"
              >
                +
              </button>
              <button
                onClick={() => {
                  const rect = gridContainerRef.current?.getBoundingClientRect()
                  let minZoom = 1.0
                  
                  if (rect && imageAspectRatio > 0) {
                    const containerWidth = rect.width - 48
                    const containerHeight = rect.height - 48
                    
                    if (containerWidth > 0 && containerHeight > 0) {
                      const imageWidth = isMobile 
                        ? Math.min(containerWidth, 800)
                        : Math.min(containerWidth, 1400)
                      const imageHeight = imageWidth / imageAspectRatio
                      
                      const minZoomX = containerWidth / Math.max(imageWidth, 1)
                      const minZoomY = containerHeight / Math.max(imageHeight, 1)
                      minZoom = Math.min(minZoomX, minZoomY, 1.0)
                    }
                  }
                  
                  const newZoom = Math.max(Math.max(zoom - 0.2, minZoom), 0.1)
                  if (newZoom <= minZoom * 1.01) {
                    setPan({ x: 0, y: 0 })
                  }
                  setZoom(newZoom)
                }}
                className="bg-white/80 hover:bg-white text-black w-8 h-8 rounded flex items-center justify-center text-lg font-bold"
              >
                −
              </button>
              <button
                onClick={resetZoomAndPan}
                className="bg-white/80 hover:bg-white text-black w-8 h-8 rounded flex items-center justify-center text-xs"
                title="Reset zoom and pan"
              >
                ⌂
              </button>
            </div>

            <div
              className="grid relative bg-black p-2 rounded"
              style={{
                gridTemplateColumns: `repeat(${mosaicData[0]?.length || 0}, 1fr)`,
                gap: "1px",
                aspectRatio: imageAspectRatio,
                // Simplified sizing - use same logic for both mobile and desktop
                width: isMobile
                  ? `min(calc(100vw - 80px), 90vh, 800px)`
                  : `min(calc(100vw - 420px), 90vh, 1400px)`,
                height: "auto", // Let aspect ratio determine height
                minWidth: "300px",
                minHeight: "300px",
                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                transformOrigin: "center",
                transition: isPanning ? "none" : "transform 0.1s ease-out"
              }}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {/* Border visualization */}
              <div 
                className="absolute pointer-events-none"
                style={{
                  top: showBorder ? '-2px' : '-1px',
                  left: showBorder ? '-2px' : '-1px',
                  right: showBorder ? '-2px' : '-1px',
                  bottom: showBorder ? '-2px' : '-1px',
                  border: showBorder ? '2px solid rgba(128, 128, 128, 0.3)' : '1px solid rgba(128, 128, 128, 0.2)',
                  borderRadius: '4px',
                  zIndex: 10
                }}
              />
              
              {mosaicData.map((row, rowIndex) =>
                row.map((color, colIndex) => {
                  const isFrame = color === "F"
                  return (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      className={`rounded-full transition-transform shadow-sm ${
                        isFrame ? 'opacity-0 pointer-events-none' : 'cursor-pointer hover:scale-105'
                      }`}
                      style={{
                        backgroundColor: isFrame ? 'transparent' : color,
                        boxShadow: isFrame ? 'none' : "inset 0 1px 2px rgba(255,255,255,0.4), inset 0 -1px 1px rgba(0,0,0,0.3)",
                        aspectRatio: "1",
                        width: "100%",
                        height: "100%",
                        minWidth: "4px",
                        minHeight: "4px",
                        pointerEvents: isPanning || isFrame ? 'none' : 'auto'
                      }}
                      onClick={() => !isPanning && isPaintMode && !isFrame && handleBrickClick(rowIndex, colIndex)}
                      onMouseEnter={() => isPaintMode && !isFrame && handleBrickHover(rowIndex, colIndex)}
                    />
                  )
                }),
              )}
            </div>
          </div>
        </div>

        {/* Two fixed lines at the bottom - only show in editor AND only on mobile */}
        {isBrickzMeClicked && isMobile && (
          <div className="fixed bottom-0 left-0 right-0 z-50">
            {/* Second row - show for different buttons with different heights */}
            {(selectedBottomBox === 0 || selectedBottomBox === 1 || selectedBottomBox === 2 || selectedBottomBox === 3 || selectedBottomBox === 4) && (
              <div className={`bg-white w-full border-t border-gray-300 rounded-tl-lg rounded-tr-lg ${
                selectedBottomBox === 4 ? 'h-[180px]' : 
                selectedBottomBox === 2 ? 'h-[100px]' : 'h-[65px]'
              }`}>
                {/* Content for different panels */}
                <div className="flex items-center justify-center h-full px-4">
                  {selectedBottomBox === 0 && (
                    <div className="flex items-center gap-4 w-full max-w-md">
                      <button
                        onClick={() => handleSizeChange(Math.max(16, mosaicSize - 16))}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 w-10 h-10 rounded flex items-center justify-center text-lg font-bold transition-colors"
                        disabled={mosaicSize <= 16}
                      >
                        −
                      </button>
                      <input
                        type="range"
                        min="16"
                        max="128"
                        step="16"
                        value={mosaicSize}
                        onChange={(e) => handleSizeChange(Number(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-sm font-medium min-w-[3rem] text-center">{getSizeLabel(mosaicSize)}</span>
                      <button
                        onClick={() => handleSizeChange(Math.min(128, mosaicSize + 16))}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 w-10 h-10 rounded flex items-center justify-center text-lg font-bold transition-colors"
                        disabled={mosaicSize >= 128}
                      >
                        +
                      </button>
                    </div>
                  )}
                  {selectedBottomBox === 1 && (
                    <div className="flex items-center gap-4 w-full max-w-md">
                      <span className="text-sm font-medium">Rahmen:</span>
                      <div 
                        onClick={handleBorderToggle}
                        className={`relative inline-flex h-6 w-11 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                          showBorder ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                            showBorder ? 'translate-x-5' : 'translate-x-0.5'
                          }`}
                          style={{ marginTop: '2px' }}
                        />
                      </div>
                    </div>
                  )}
                  {selectedBottomBox === 2 && (
                    <div className="flex flex-col items-center gap-3 w-full max-w-md">
                      {showAdjustmentMenu ? (
                        <div className="grid grid-cols-2 gap-2 w-full">
                          <button
                            onClick={() => handleAdjustmentSelection('brightness')}
                            className="py-2 px-3 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium transition-colors"
                          >
                            Helligkeit
                          </button>
                          <button
                            onClick={() => handleAdjustmentSelection('contrast')}
                            className="py-2 px-3 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium transition-colors"
                          >
                            Kontrast
                          </button>
                          <button
                            onClick={() => handleAdjustmentSelection('saturation')}
                            className="py-2 px-3 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium transition-colors"
                          >
                            Sättigung
                          </button>
                          <button
                            onClick={() => handleAdjustmentSelection('sharpness')}
                            className="py-2 px-3 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium transition-colors"
                          >
                            Schärfe
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="text-sm font-medium">{getAdjustmentLabel()}</span>
                          <div className="flex items-center gap-4 w-full">
                            <button
                              onClick={() => handleAdjustmentChange(currentAdjustmentType, Math.max(-50, getCurrentAdjustmentValue() - 1))}
                              className="bg-gray-200 hover:bg-gray-300 text-gray-700 w-10 h-10 rounded flex items-center justify-center text-lg font-bold transition-colors"
                              disabled={getCurrentAdjustmentValue() <= -50}
                            >
                              −
                            </button>
                            <input
                              type="range"
                              min="-50"
                              max="50"
                              step="1"
                              value={getCurrentAdjustmentValue()}
                              onChange={(e) => handleAdjustmentChange(currentAdjustmentType, Number(e.target.value))}
                              className="flex-1"
                            />
                            <span className="text-sm font-medium min-w-[3rem] text-center">{getCurrentAdjustmentValue()}</span>
                            <button
                              onClick={() => handleAdjustmentChange(currentAdjustmentType, Math.min(50, getCurrentAdjustmentValue() + 1))}
                              className="bg-gray-200 hover:bg-gray-300 text-gray-700 w-10 h-10 rounded flex items-center justify-center text-lg font-bold transition-colors"
                              disabled={getCurrentAdjustmentValue() >= 50}
                            >
                              +
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  {selectedBottomBox === 3 && (
                    <div className="flex flex-col items-center gap-3 w-full max-w-md">
                      <div className="flex gap-1 overflow-x-auto w-full pb-2" style={{ scrollbarWidth: 'thin' }}>
                        {getSortedColors().map((color, index) => {
                          const isUsed = isColorUsed(color.hex);
                          const usageCount = getColorUsageCount(color.hex);
                          return (
                            <button
                              key={index}
                              className={`w-8 h-8 rounded-full border-2 flex-shrink-0 ${
                                selectedColor === color.hex 
                                  ? "border-gray-800" 
                                  : isUsed
                                    ? "border-blue-500"
                                    : "border-gray-300"
                              } ${isUsed ? 'ring-2 ring-blue-200' : ''} transition-all`}
                              style={{ backgroundColor: color.hex }}
                              onClick={() => setSelectedColor(color.hex)}
                              title={`${color.name} (${color.yourbrickz_id})${isUsed ? ` - ${usageCount} Brickz` : ''}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {selectedBottomBox === 4 && <span className="text-gray-600">Cart Settings Panel (Tall)</span>}
                </div>
              </div>
            )}
            
            <div className="h-[50px] bg-white w-full border-t border-gray-300 flex">
              {[
                { icon: 'size.svg', index: 0 },
                { icon: 'frame.svg', index: 1 },
                { icon: 'contrast.svg', index: 2 },
                { icon: 'paint.svg', index: 3 },
                { icon: 'cart.svg', index: 4 }
              ].map(({ icon, index }) => (
                <div
                  key={index}
                  onClick={() => handleBottomBoxClick(index)}
                  className={`flex-1 h-full cursor-pointer transition-all border-r border-gray-300 last:border-r-0 flex items-center justify-center ${
                    selectedBottomBox === index
                      ? 'bg-blue-100 border-t-2 border-t-blue-400'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <img 
                    src={`/icons/${icon}`} 
                    alt={`Icon ${index + 1}`}
                    className="w-10 h-10"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen py-10 px-6 text-center pb-[100px]">
      {/* Nur anzeigen, wenn noch kein Bild ausgewählt wurde "Padding" */}
      {!isBrickzMeClicked && !selectedImage && (
        <>
          <h1 className="text-4xl font-bold mb-4">Dein yourbrickz</h1>
          <p className="text-lg text-gray-700 mb-8">
            Lade ein Foto hoch oder wähle eines aus unserer Bibliothek.
          </p>
        </>
      )}

      {!selectedImage && !isBrickzMeClicked ? (
        <div className="flex flex-col items-center gap-6">
          {/* Bild hochladen */}
          <label className="cursor-pointer bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition">
            Bild hochladen
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </label>

          {/* Zufällige Bilder */}
          <div className="grid grid-cols-2 gap-4">
            {randomImages.map((image, index) => (
              <img
                key={index}
                src={`/example-images/diashow/${image}`}
                alt={`Example ${index + 1}`}
                className="cursor-pointer w-40 h-40 object-cover rounded-lg border hover:border-blue-500 transition"
                onClick={() => setSelectedImage(`/example-images/diashow/${image}`)}
              />
            ))}
          </div>
        </div>
      ) : (
        !isBrickzMeClicked && (
          <div className="flex flex-col items-center gap-6">
            <h2 className="text-2xl font-semibold">Dein ausgewähltes Bild</h2>
            <img
              src={selectedImage || undefined} // Ensure type compatibility
              alt="Selected"
              className="w-[calc(100vw-20px)] max-w-[1200px] max-h-[1200px] object-contain rounded-lg border lg:w-auto"
            />
            <div className="flex gap-4">
              <button
                className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition"
                onClick={() => setSelectedImage(null)}
              >
                Bild ändern
              </button>
              <button
                className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition"
                onClick={handleBrickzMe}
              >
                yourbrickz personalisieren
              </button>
            </div>
          </div>
        )
      )}

      {/* Two fixed lines at the bottom - only show in editor AND only on mobile */}
      {isBrickzMeClicked && isMobile && (
        <div className="fixed bottom-0 left-0 right-0 z-50">
          {/* Second row - show for different buttons with different heights */}
          {(selectedBottomBox === 0 || selectedBottomBox === 1 || selectedBottomBox === 2 || selectedBottomBox === 3 || selectedBottomBox === 4) && (
            <div className={`bg-white w-full border-t border-gray-300 rounded-tl-lg rounded-tr-lg ${
              selectedBottomBox === 4 ? 'h-[180px]' : 
              selectedBottomBox === 2 ? 'h-[100px]' : 'h-[65px]'
            }`}>
              {/* Content for different panels */}
              <div className="flex items-center justify-center h-full px-4">
                {selectedBottomBox === 0 && (
                  <div className="flex items-center gap-4 w-full max-w-md">
                    <button
                      onClick={() => handleSizeChange(Math.max(16, mosaicSize - 16))}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 w-10 h-10 rounded flex items-center justify-center text-lg font-bold transition-colors"
                      disabled={mosaicSize <= 16}
                    >
                      −
                    </button>
                    <input
                      type="range"
                      min="16"
                      max="128"
                      step="16"
                      value={mosaicSize}
                      onChange={(e) => handleSizeChange(Number(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-sm font-medium min-w-[3rem] text-center">{getSizeLabel(mosaicSize)}</span>
                    <button
                      onClick={() => handleSizeChange(Math.min(128, mosaicSize + 16))}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 w-10 h-10 rounded flex items-center justify-center text-lg font-bold transition-colors"
                      disabled={mosaicSize >= 128}
                    >
                      +
                    </button>
                  </div>
                )}
                {selectedBottomBox === 1 && (
                  <div className="flex items-center gap-4 w-full max-w-md">
                    <span className="text-sm font-medium">Rahmen:</span>
                    <div 
                      onClick={handleBorderToggle}
                      className={`relative inline-flex h-6 w-11 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                        showBorder ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          showBorder ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                        style={{ marginTop: '2px' }}
                      />
                    </div>
                  </div>
                )}
                {selectedBottomBox === 2 && (
                  <div className="flex flex-col items-center gap-3 w-full max-w-md">
                    {showAdjustmentMenu ? (
                      <div className="grid grid-cols-2 gap-2 w-full">
                        <button
                          onClick={() => handleAdjustmentSelection('brightness')}
                          className="py-2 px-3 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium transition-colors"
                        >
                          Helligkeit
                        </button>
                        <button
                          onClick={() => handleAdjustmentSelection('contrast')}
                          className="py-2 px-3 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium transition-colors"
                        >
                          Kontrast
                        </button>
                        <button
                          onClick={() => handleAdjustmentSelection('saturation')}
                          className="py-2 px-3 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium transition-colors"
                        >
                          Sättigung
                        </button>
                        <button
                          onClick={() => handleAdjustmentSelection('sharpness')}
                          className="py-2 px-3 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium transition-colors"
                        >
                          Schärfe
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm font-medium">{getAdjustmentLabel()}</span>
                        <div className="flex items-center gap-4 w-full">
                          <button
                            onClick={() => handleAdjustmentChange(currentAdjustmentType, Math.max(-50, getCurrentAdjustmentValue() - 1))}
                            className="bg-gray-200 hover:bg-gray-300 text-gray-700 w-10 h-10 rounded flex items-center justify-center text-lg font-bold transition-colors"
                            disabled={getCurrentAdjustmentValue() <= -50}
                          >
                            −
                          </button>
                          <input
                            type="range"
                            min="-50"
                            max="50"
                            step="1"
                            value={getCurrentAdjustmentValue()}
                            onChange={(e) => handleAdjustmentChange(currentAdjustmentType, Number(e.target.value))}
                            className="flex-1"
                          />
                          <span className="text-sm font-medium min-w-[3rem] text-center">{getCurrentAdjustmentValue()}</span>
                          <button
                            onClick={() => handleAdjustmentChange(currentAdjustmentType, Math.min(50, getCurrentAdjustmentValue() + 1))}
                            className="bg-gray-200 hover:bg-gray-300 text-gray-700 w-10 h-10 rounded flex items-center justify-center text-lg font-bold transition-colors"
                            disabled={getCurrentAdjustmentValue() >= 50}
                          >
                            +
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
                {selectedBottomBox === 3 && (
                  <div className="flex flex-col items-center gap-3 w-full max-w-md">
                    <div className="flex gap-1 overflow-x-auto w-full pb-2" style={{ scrollbarWidth: 'thin' }}>
                      {getSortedColors().map((color, index) => {
                        const isUsed = isColorUsed(color.hex);
                        const usageCount = getColorUsageCount(color.hex);
                        return (
                          <button
                            key={index}
                            className={`w-8 h-8 rounded-full border-2 flex-shrink-0 ${
                              selectedColor === color.hex 
                                ? "border-gray-800" 
                                : isUsed
                                  ? "border-blue-500"
                                  : "border-gray-300"
                            } ${isUsed ? 'ring-2 ring-blue-200' : ''} transition-all`}
                            style={{ backgroundColor: color.hex }}
                            onClick={() => setSelectedColor(color.hex)}
                            title={`${color.name} (${color.yourbrickz_id})${isUsed ? ` - ${usageCount} Brickz` : ''}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
                {selectedBottomBox === 4 && <span className="text-gray-600">Cart Settings Panel (Tall)</span>}
              </div>
            </div>
          )}
          
          <div className="h-[50px] bg-white w-full border-t border-gray-300 flex">
            {[
              { icon: 'size.svg', index: 0 },
              { icon: 'frame.svg', index: 1 },
              { icon: 'contrast.svg', index: 2 },
              { icon: 'paint.svg', index: 3 },
              { icon: 'cart.svg', index: 4 }
            ].map(({ icon, index }) => (
              <div
                key={index}
                onClick={() => handleBottomBoxClick(index)}
                className={`flex-1 h-full cursor-pointer transition-all border-r border-gray-300 last:border-r-0 flex items-center justify-center ${
                  selectedBottomBox === index
                    ? 'bg-blue-100 border-t-2 border-t-blue-400'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <img 
                  src={`/icons/${icon}`} 
                  alt={`Icon ${index + 1}`}
                  className="w-10 h-10"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
