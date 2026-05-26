import qrcode

# URL to encode
url = "https://magnifresh.com/"

# Generate QR Code
qr = qrcode.QRCode(
    version=1,
    error_correction=qrcode.constants.ERROR_CORRECT_H,
    box_size=10,
    border=4,
)
qr.add_data(url)
qr.make(fit=True)

# Create an image from the QR Code instance
img = qr.make_image(fill_color="black", back_color="white")

# Save it
img.save("magnifresh-qr.png")
print("QR Code generated successfully as 'magnifresh-qr.png'!")
