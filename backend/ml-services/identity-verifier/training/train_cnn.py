import os
import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.applications import Xception
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout
from tensorflow.keras.models import Model
from tensorflow.keras.optimizers import Adam
from training.utils import setup_logger

logger = setup_logger("train_cnn")

def build_model(input_shape=(299, 299, 3)):
    """
    Builds an Xception-based deepfake detector.
    """
    base_model = Xception(weights='imagenet', include_top=False, input_shape=input_shape)
    
    # Freeze base layers (optional, unfreeze for fine-tuning)
    base_model.trainable = False 
    
    x = base_model.output
    x = GlobalAveragePooling2D()(x)
    x = Dense(1024, activation='relu')(x)
    x = Dropout(0.5)(x)
    predictions = Dense(1, activation='sigmoid')(x) # Binary classification
    
    model = Model(inputs=base_model.input, outputs=predictions)
    return model

def train_cnn(data_dir: str, output_path: str, epochs: int = 10, batch_size: int = 32):
    """
    Trains the CNN using images in data_dir/real and data_dir/fake.
    """
    img_size = (299, 299)
    
    # Data Augmentation
    train_datagen = ImageDataGenerator(
        rescale=1./255,
        rotation_range=20,
        horizontal_flip=True,
        validation_split=0.2
    )
    
    train_generator = train_datagen.flow_from_directory(
        data_dir,
        target_size=img_size,
        batch_size=batch_size,
        class_mode='binary',
        subset='training'
    )
    
    val_generator = train_datagen.flow_from_directory(
        data_dir,
        target_size=img_size,
        batch_size=batch_size,
        class_mode='binary',
        subset='validation'
    )
    
    model = build_model()
    
    model.compile(
        optimizer=Adam(learning_rate=0.0001),
        loss='binary_crossentropy',
        metrics=['accuracy', tf.keras.metrics.AUC()]
    )
    
    logger.info("Starting training...")
    history = model.fit(
        train_generator,
        epochs=epochs,
        validation_data=val_generator
    )
    
    model.save(output_path)
    logger.info(f"Model saved to {output_path}")

if __name__ == "__main__":
    # Expects folder structure: data/datasets/images/real/*.jpg & fake/*.jpg
    if os.path.exists("data/datasets/images"):
        train_cnn("data/datasets/images", "models/weights/xception_deepfake_v2.h5")
    else:
        logger.warning("Image dataset not found. Skipping CNN training.")