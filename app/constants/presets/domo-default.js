export const DOMO_DEFAULT = {
    name: "DOMO DEFAULT",
    description: "Standard Domo branding: Blue, Floyd-Steinberg, 50% density",
    backgroundColor: "#FFFFFF",
    layers: [
        {
            colorKey: "blue",
            ditherType: "floydSteinberg",
            threshold: 0.5,
            scale: 2,
            channel: "gray",
            angle: 0,
            offsetX: 0,
            offsetY: 0,
            blendMode: "multiply",
            opacity: 1,
            visible: true,
            knockout: false
        }
    ]
};
