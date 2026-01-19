-- Create storage bucket for car images
INSERT INTO storage.buckets (id, name, public)
VALUES ('car-images', 'car-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for car images bucket
CREATE POLICY "Anyone can view car images"
ON storage.objects FOR SELECT
USING (bucket_id = 'car-images');

CREATE POLICY "Authenticated users can upload car images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'car-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own car images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'car-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own car images"
ON storage.objects FOR DELETE
USING (bucket_id = 'car-images' AND auth.uid()::text = (storage.foldername(name))[1]);