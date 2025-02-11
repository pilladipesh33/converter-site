"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";

import ReactDropzone from "react-dropzone";
import {
	UploadCloud,
	FileSymlink,
	X,
	Download,
	Loader2,
	AlertCircle,
	CircleCheck,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./ui/select";
import { Button } from "./ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

import { formatFileSize } from "@/utils/file";
import fileToIcon from "@/utils/file-to-icon";
import compressFileName from "@/utils/compress-filenames";
import convertFile from "@/utils/media-convert";
import loadFfmpeg from "@/utils/load-ffmpeg";
import { ACCEPTED_FORMAT, EXTENSIONS } from "@/utils/constant";

import { Actions } from "@/types/action";
import { FilesType } from "@/types/file";

export const MediaZone = () => {
	const { toast } = useToast();
	const [isHover, setIsHover] = useState(false);
	const [actions, setActions] = useState<Actions[]>([]);
	const [isReady, setIsReady] = useState(false);
	const [files, setFiles] = useState<Array<FilesType>>([]);
	const [isLoaded, setIsLoaded] = useState(false);
	const [isConverting, setIsConverting] = useState(false);
	const [isDone, setIsDone] = useState(false);
	const ffmpegRef = useRef<FFmpeg | null>(null);

	const reset = () => {
		setIsDone(false);
		setActions([]);
		setFiles([]);
		setIsReady(false);
		setIsConverting(false);
	};

	useEffect(() => {
		const loadFFmpeg = async () => {
			const ffmpeg = await loadFfmpeg();
			ffmpegRef.current = ffmpeg;
			setIsLoaded(true);
		};
		loadFFmpeg();
	}, []);

	useEffect(() => {
		checkIsReady();
	});

	const handleUpload = (data: FilesType[]) => {
		resetHoverState();
		setFiles(data);
		const newActions = data.map((file) => ({
			file_name: file.name,
			file_size: file.size,
			from: file.name.slice(((file.name.lastIndexOf(".") - 1) >>> 0) + 2),
			to: null,
			file_type: file.type,
			file,
			is_converted: false,
			is_converting: false,
			is_error: false,
		}));
		setActions(newActions);
	};

	const convert = async () => {
		const updatedActions = actions.map((action) => ({
			...action,
			is_converting: true,
		}));
		setActions(updatedActions);
		setIsConverting(true);

		for (const action of updatedActions) {
			try {
				// const { url, output } = await convertFile(ffmpegRef.current, action);
				if (ffmpegRef.current) {
					const { url, output } = await convertFile(ffmpegRef.current, action);
					setActions((prevActions) =>
						prevActions.map((a) =>
							a === action
								? { ...a, is_converted: true, is_converting: false, url, output }
								: a
						)
					);
				  } else {
					console.error("FFmpeg instance is not initialized");
				  }
				
			} catch (err: unknown) {
				console.log(err);
				setActions((prevActions) =>
					prevActions.map((a) =>
						a === action
							? {
									...a,
									is_converted: false,
									is_converting: false,
									is_error: true,
							  }
							: a
					)
				);
			}
		}

		setIsDone(true);
		setIsConverting(false);
	};

	const download = (action: Actions) => {
		const a = document.createElement("a");
		a.style.display = "none";
		a.href = action.url ?? "";
		a.download = action.output ?? "";
		document.body.appendChild(a);
		a.click();
		URL.revokeObjectURL(action.url ?? "");
		document.body.removeChild(a);
	};

	const downloadAll = () => {
		actions.forEach((action) => {
			if (!action.is_error) download(action);
		});
	};

	const updateAction = useCallback((fileName: string, to: string) => {
		setActions((prevActions) => {
			const newActions = prevActions.map((action) =>
				action.file_name === fileName ? { ...action, to } : action
			);
			const allReady = newActions.every((action) => action.to);
			setIsReady(allReady);
			return newActions;
		});
	}, []);

	const deleteAction = useCallback((action: Actions) => {
		setActions((prevActions) => prevActions.filter((a) => a !== action));
		setFiles((prevFiles) =>
			prevFiles.filter((f) => f.name !== action.file_name)
		);
	}, []);

	const checkIsReady = () => {
		const allReady = actions.every((action) => action.to);
		setIsReady(allReady);
	};

	const handleHover = () => setIsHover(true);
	const resetHoverState = () => setIsHover(false);

	if (actions.length) {
		return (
			<div className="space-y-6">
				<div className="flex w-full justify-end">
					{isDone ? (
						<div className="w-fit flex items-center justify-center gap-x-5">
							<Button
								onClick={reset}
								variant="outline"
								className="rounded-xl shadow-md"
							>
								Convert Another File(s)
							</Button>
							<Button
								className="rounded-xl font-semibold relative py-4 text-md flex gap-2 items-center w-full shadow-md"
								onClick={downloadAll}
							>
								{actions.length > 1 ? "Download All" : "Download"}
								<Download />
							</Button>
						</div>
					) : (
						<Button
							disabled={!isReady || isConverting}
							className="rounded-xl font-semibold relative py-4 text-md flex items-center w-44"
							onClick={convert}
						>
							{isConverting ? (
								<span className="animate-spin text-lg">
									<Loader2 />
								</span>
							) : (
								<span>Convert Now</span>
							)}
						</Button>
					)}
				</div>
				{actions.map((action, index) => (
					<div
						key={index}
						className="py-4 space-y-2 lg:py-0 relative cursor-pointer rounded-xl border h-fit lg:h-20 px-4 lg:px-10 flex flex-wrap lg:flex-nowrap items-center justify-between"
					>
						{!isLoaded && (
							<Skeleton className="h-full w-full -ml-10 cursor-progress absolute rounded-xl" />
						)}
						<div className="flex gap-4 items-center">
							<span className="text-2xl text-blue-500">
								{fileToIcon(action.file_type)}
							</span>
							<div className="flex items-center gap-1 w-96">
								<span className="text-md font-medium overflow-x-hidden">
									{compressFileName(action.file_name)}
								</span>
								<span className="text-muted-foreground text-sm">
									({formatFileSize(action.file_size)})
								</span>
							</div>
						</div>
						{action.is_error ? (
							<Badge
								variant="destructive"
								className="flex gap-2 rounded-full bg-[#F87171]/20"
							>
								<span className="text-[#DC2626]">Error Converting File</span>
								<AlertCircle className="text-[#DC2626]" />
							</Badge>
						) : action.is_converted ? (
							<Badge
								variant="default"
								className="flex gap-2 bg-[#4ADE5E]/20 rounded-full"
							>
								<span className="text-[#16A329]">Done</span>
								<CircleCheck className="text-[#16A329]" />
							</Badge>
						) : action.is_converting ? (
							<Badge
								variant="default"
								className="flex gap-2 rounded-full bg-[#BCBDC2]/20"
							>
								<span className="text-[#18181B]">Converting</span>
								<span className="animate-spin text-[#18181B]">
									<Loader2 />
								</span>
							</Badge>
						) : (
							<div className="text-muted-foreground text-md flex items-center gap-4">
								<span>Convert to</span>
								<Select
									value={action.to || "..."}
									onValueChange={(value) => {
										updateAction(action.file_name, value);
									}}
								>
									<SelectTrigger className="w-32 outline-none focus:outline-none focus:ring-0 text-center text-muted-foreground bg-background text-md font-medium">
										<SelectValue placeholder="..." />
									</SelectTrigger>
									<SelectContent className="h-fit">
										{action.file_type.includes("image") && (
											<div className="grid grid-cols-2 gap-2 w-fit">
												{EXTENSIONS.image.map((ext, i) => (
													<div key={i} className="col-span-1 text-center">
														<SelectItem value={ext} className="mx-auto">
															{ext}
														</SelectItem>
													</div>
												))}
											</div>
										)}
										{action.file_type.includes("video") && (
											<Tabs defaultValue="video" className="w-full">
												<TabsList className="w-full">
													<TabsTrigger value="video" className="w-full">
														Video
													</TabsTrigger>
													<TabsTrigger value="audio" className="w-full">
														Audio
													</TabsTrigger>
												</TabsList>
												<TabsContent value="video">
													<div className="grid grid-cols-3 gap-2 w-fit">
														{EXTENSIONS.video.map((ext, i) => (
															<div key={i} className="col-span-1 text-center">
																<SelectItem value={ext} className="mx-auto">
																	{ext}
																</SelectItem>
															</div>
														))}
													</div>
												</TabsContent>
												<TabsContent value="audio">
													<div className="grid grid-cols-3 gap-2 w-fit">
														{EXTENSIONS.audio.map((ext, i) => (
															<div key={i} className="col-span-1 text-center">
																<SelectItem value={ext} className="mx-auto">
																	{ext}
																</SelectItem>
															</div>
														))}
													</div>
												</TabsContent>
											</Tabs>
										)}
										{action.file_type.includes("audio") && (
											<div className="grid grid-cols-2 gap-2 w-fit">
												{EXTENSIONS.audio.map((ext, i) => (
													<div key={i} className="col-span-1 text-center">
														<SelectItem value={ext} className="mx-auto">
															{ext}
														</SelectItem>
													</div>
												))}
											</div>
										)}
									</SelectContent>
								</Select>
							</div>
						)}
						{action.is_converted ? (
							<Button
								variant="outline"
								onClick={() => download(action)}
								className="ml-5 shadow-sm"
							>
								Download
							</Button>
						) : (
							<span
								onClick={() => deleteAction(action)}
								className="cursor-pointer hover:bg-muted rounded-full h-10 w-10 flex items-center justify-center text-2xl text-foreground"
							>
								<X />
							</span>
						)}
					</div>
				))}
			</div>
		);
	}

	console.log(files);

	return (
		<ReactDropzone
			onDrop={handleUpload}
			onDragEnter={handleHover}
			onDragLeave={resetHoverState}
			accept={ACCEPTED_FORMAT}
			onDropRejected={() => {
				resetHoverState();
				toast({
					variant: "destructive",
					title: "Error uploading your file(s)",
					description: "Allowed Files: Audio, Video and Images.",
					duration: 5000,
				});
			}}
			onError={() => {
				resetHoverState();
				toast({
					variant: "destructive",
					title: "Error uploading your file(s)",
					description: "Allowed Files: Audio, Video and Images.",
					duration: 5000,
				});
			}}
		>
			{({ getRootProps, getInputProps }) => (
				<div
					{...getRootProps()}
					className={`mt-5 bg-white h-72 w-full lg:h-80 xl:h-96 rounded-3xl shadow-sm border-neutral-400 border-4 border-dashed cursor-pointer flex items-center justify-center transition-colors duration-300 hover:border-neutral-200 ${
						isHover ? "border-neutral-200" : "border-neutral-400"
					}`}
				>
					<input {...getInputProps()} />
					<div className="space-y-4 text-foreground">
						{isHover ? (
							<>
								<div className="justify-center flex text-6xl">
									<FileSymlink className="h-16 w-16" />
								</div>
								<h3 className="text-center font-regular text-xl">
									Drop your files here
								</h3>
							</>
						) : (
							<>
								<div className="justify-center flex text-6xl">
									<UploadCloud className="h-20 w-20" />
								</div>
								<h3 className="text-center font-regular text-xl">
									Drag and drop your media files here, or
									<br /> click to upload
								</h3>
							</>
						)}
					</div>
				</div>
			)}
		</ReactDropzone>
	);
};
