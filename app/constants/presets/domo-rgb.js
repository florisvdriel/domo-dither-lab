export const DOMO_RGB = {
    name: "DOMO RGB",
    description: "Custom preset",
    layers: [
        {
            colorKey: "green",
            ditherType: "floydSteinberg",
            threshold: 0.5,
            scale: 2,
            channel: "green",
            angle: 0,
            offsetX: 0,
            offsetY: 0,
            blendMode: "multiply",
            opacity: 1,
            visible: true,
            knockout: false
        },
        {
            colorKey: "red",
            ditherType: "floydSteinberg",
            threshold: 0.5,
            scale: 2,
            channel: "red",
            angle: 0,
            offsetX: 0,
            offsetY: 0,
            blendMode: "multiply",
            opacity: 1,
            visible: true,
            knockout: false
        },
        {
            colorKey: "blue",
            ditherType: "floydSteinberg",
            threshold: 0.5,
            scale: 2,
            channel: "blue",
            angle: 0,
            offsetX: 0,
            offsetY: 0,
            blendMode: "multiply",
            opacity: 1,
            visible: true,
            knockout: false
        }
    ],
    inkBleed: false,
    inkBleedAmount: 0.5,
    paperTexture: false,
    backgroundColor: "#ffffff"
};
